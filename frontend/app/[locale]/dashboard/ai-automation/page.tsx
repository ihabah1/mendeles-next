"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstagramPreview, LinkedInPreview, TikTokPreview } from "@/components/social/social-previews";
import { useAuth } from "@/lib/auth/auth-context";
import {
  socialApi,
  type SocialCampaign,
  type SocialPlatform,
} from "@/lib/api/social";
import { cn } from "@/lib/utils";

const CAMPAIGN_TYPES = [
  ["traffic", "Traffic"],
  ["tool_launch", "Tool Launch"],
  ["viral", "Viral"],
  ["tutorial", "Tutorial"],
  ["product", "Product"],
  ["announcement", "Announcement"],
  ["news", "News"],
] as const;

const TONES = [
  ["professional", "Professional"],
  ["casual", "Casual"],
  ["funny", "Funny"],
  ["emotional", "Emotional"],
  ["curious", "Curious"],
  ["shocking", "Shocking"],
] as const;

const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

const GEN_STEPS = [
  "Generating AI...",
  "Crafting captions...",
  "Building hashtags & CTA...",
  "Preparing media prompts...",
];

const PUBLISH_STEPS = [
  "Generating AI...",
  "Generating image...",
  "Uploading media...",
  "Publishing to Buffer...",
  "Completed",
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AiAutomationPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("automation.view");
  const canCreate = hasPermission("automation.create");
  const canManage = hasPermission("automation.manage");
  const qc = useQueryClient();

  const [goal, setGoal] = useState("");
  const [campaignType, setCampaignType] = useState<string>("traffic");
  const [tone, setTone] = useState<string>("professional");
  const [audience, setAudience] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("https://mendeles.com");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["linkedin", "instagram", "tiktok"]);
  const [active, setActive] = useState<SocialCampaign | null>(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [timezone, setTimezone] = useState("Asia/Jerusalem");
  const [genStep, setGenStep] = useState(0);
  const [publishStep, setPublishStep] = useState(-1);
  const [error, setError] = useState("");

  const status = useQuery({
    queryKey: ["social-status"],
    queryFn: socialApi.status,
    enabled: canView,
  });

  const history = useQuery({
    queryKey: ["social-campaigns"],
    queryFn: socialApi.list,
    enabled: canView,
  });

  useEffect(() => {
    if (!active) return;
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % GEN_STEPS.length;
      setGenStep(i);
    }, 900);
    return () => window.clearInterval(id);
  }, [active?.status === "generating"]);

  const generate = useMutation({
    mutationFn: () =>
      socialApi.generate({
        goal,
        campaign_type: campaignType,
        tone,
        target_audience: audience,
        website_url: websiteUrl,
        media_type: mediaType,
        platforms,
      }),
    onMutate: () => {
      setError("");
      setGenStep(0);
      setActive({ status: "generating" } as SocialCampaign);
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
    },
    onError: (err: Error) => {
      setActive(null);
      setError(err.message || "Generation failed");
    },
  });

  const saveEdits = useMutation({
    mutationFn: () => {
      if (!active?.id) throw new Error("No campaign");
      return socialApi.update(active.id, {
        title: active.title,
        captions: active.captions,
        hashtags: active.hashtags,
        cta: active.cta,
        media_prompt: mediaType === "image" ? active.media_prompt : active.media_prompt,
        video_prompt: active.video_prompt,
        timezone,
      });
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      const scheduledAt =
        scheduleMode && scheduleDate
          ? new Date(`${scheduleDate}T${scheduleTime || "10:00"}:00`).toISOString()
          : undefined;
      setPublishStep(0);
      const timers = PUBLISH_STEPS.map((_, idx) =>
        window.setTimeout(() => setPublishStep(idx), idx * 700),
      );
      try {
        return await socialApi.publish({
          campaign_id: active.id,
          mode: scheduleMode ? "schedule" : "now",
          scheduled_at: scheduledAt,
          timezone,
        });
      } finally {
        timers.forEach((t) => window.clearTimeout(t));
        setPublishStep(PUBLISH_STEPS.length - 1);
      }
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      if (data.status === "failed") setError(data.last_error || "Publish failed");
      else setError("");
    },
    onError: (err: Error) => setError(err.message || "Publish failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => socialApi.remove(id),
    onSuccess: (_, id) => {
      if (active?.id === id) setActive(null);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
    },
  });

  const republish = useMutation({
    mutationFn: (id: string) => socialApi.republish(id),
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const hashtagText = useMemo(() => {
    if (!active) return "";
    return Object.entries(active.hashtags || {})
      .map(([platform, tags]) => `${platform}: ${(tags || []).join(" ")}`)
      .join("\n");
  }, [active]);

  function setHashtagText(value: string) {
    if (!active) return;
    const next: SocialCampaign["hashtags"] = { ...active.hashtags };
    for (const line of value.split("\n")) {
      const [platform, ...rest] = line.split(":");
      const key = platform?.trim() as SocialPlatform;
      if (!key || !["linkedin", "instagram", "tiktok"].includes(key)) continue;
      next[key] = rest
        .join(":")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }
    setActive({ ...active, hashtags: next });
  }

  function togglePlatform(id: SocialPlatform) {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">אין הרשאה לצפות ב־AI Automation.</p>
      </Card>
    );
  }

  const generating = generate.isPending || active?.status === "generating";
  const publishing = publish.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6F42F5]">Automation</p>
        <h1 className="text-3xl font-extrabold tracking-tight">AI Automation</h1>
        <p className="max-w-2xl text-sm text-[var(--muted-fg)]">
          Create, preview, schedule and publish AI social campaigns through Buffer — all on one page.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-full px-3 py-1 font-semibold",
              status.data?.buffer_configured
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
            )}
          >
            Buffer: {status.data?.buffer_configured ? "Connected" : "Not configured"}
          </span>
          {status.data?.error ? <span className="text-red-600">{status.data.error}</span> : null}
        </div>
      </header>

      {/* Generate */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Generate AI Campaign</h2>
        <Card className="space-y-4 !rounded-2xl">
          <label className="block text-sm font-medium">
            Campaign Goal
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Drive signups to Mendeles free tools and book demos"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Campaign Type
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
              >
                {CAMPAIGN_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Tone
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                {TONES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Target Audience
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="SMB owners, marketers, agencies…"
              />
            </label>
            <label className="block text-sm font-medium">
              Website URL
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Media Type</p>
            <div className="flex flex-wrap gap-2">
              {(["image", "video"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMediaType(m)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    mediaType === m ? "bg-[#6F42F5] text-white" : "bg-[var(--muted)] text-[var(--fg)]",
                  )}
                >
                  {m === "image" ? "Image" : "Video"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Platforms</p>
            <div className="flex flex-wrap gap-4">
              {PLATFORMS.map((p) => (
                <label key={p.id} className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={platforms.includes(p.id)}
                    onChange={() => togglePlatform(p.id)}
                    className="h-4 w-4 accent-[#6F42F5]"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <Button
            type="button"
            disabled={!canCreate || !goal.trim() || platforms.length === 0 || generate.isPending}
            onClick={() => generate.mutate()}
            className="rounded-full bg-[#6F42F5] px-6 font-bold text-white hover:bg-[#5a32d4]"
          >
            {generate.isPending ? "Generating…" : "Generate Campaign"}
          </Button>

          {generating ? (
            <div className="space-y-2 rounded-2xl border border-[#6F42F5]/20 bg-[#6F42F5]/5 p-4">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-[#6F42F5]" />
              </div>
              <p className="text-sm font-medium text-[#6F42F5]">{GEN_STEPS[genStep]}</p>
            </div>
          ) : null}
        </Card>
      </section>

      {/* Previews + edit */}
      {active && active.id ? (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Social Preview</h2>
                <p className="text-sm text-[var(--muted-fg)]">{active.main_idea}</p>
              </div>
              <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold uppercase">{active.status}</span>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {platforms.includes("linkedin") || active.captions?.linkedin ? <LinkedInPreview campaign={active} /> : null}
              {platforms.includes("instagram") || active.captions?.instagram ? <InstagramPreview campaign={active} /> : null}
              {platforms.includes("tiktok") || active.captions?.tiktok ? <TikTokPreview campaign={active} /> : null}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold">Edit Before Publish</h2>
            <Card className="space-y-4 !rounded-2xl">
              <label className="block text-sm font-medium">
                Campaign title
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={active.title}
                  onChange={(e) => setActive({ ...active, title: e.target.value })}
                />
              </label>
              {(["linkedin", "instagram", "tiktok"] as SocialPlatform[]).map((platform) =>
                active.captions?.[platform] !== undefined || platforms.includes(platform) ? (
                  <label key={platform} className="block text-sm font-medium capitalize">
                    {platform} caption
                    <textarea
                      className="mt-1 min-h-28 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      value={active.captions?.[platform] || ""}
                      onChange={(e) =>
                        setActive({
                          ...active,
                          captions: { ...active.captions, [platform]: e.target.value },
                        })
                      }
                    />
                  </label>
                ) : null,
              )}
              <label className="block text-sm font-medium">
                Hashtags (one platform per line: linkedin: #a #b)
                <textarea
                  className="mt-1 min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-xs"
                  value={hashtagText}
                  onChange={(e) => setHashtagText(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                CTA
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={active.cta}
                  onChange={(e) => setActive({ ...active, cta: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Media prompt
                <textarea
                  className="mt-1 min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={active.media_type === "video" ? active.video_prompt || active.media_prompt : active.media_prompt}
                  onChange={(e) =>
                    setActive(
                      active.media_type === "video"
                        ? { ...active, video_prompt: e.target.value }
                        : { ...active, media_prompt: e.target.value },
                    )
                  }
                />
              </label>
              {canManage ? (
                <Button type="button" variant="outline" onClick={() => saveEdits.mutate()} disabled={saveEdits.isPending}>
                  {saveEdits.isPending ? "Saving…" : "Save edits"}
                </Button>
              ) : null}
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold">Publish</h2>
            <Card className="space-y-4 !rounded-2xl">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={!canManage || publishing}
                  onClick={() => {
                    setScheduleMode(false);
                    publish.mutate();
                  }}
                  className="rounded-full bg-[#6F42F5] px-6 font-bold text-white"
                >
                  Publish Now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canManage}
                  onClick={() => setScheduleMode(true)}
                  className="rounded-full"
                >
                  Schedule
                </Button>
              </div>

              {scheduleMode ? (
                <div className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-3">
                  <label className="text-sm font-medium">
                    Date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Time
                    <input
                      type="time"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Timezone
                    <select
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="Asia/Jerusalem">Asia/Jerusalem</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                    </select>
                  </label>
                  <Button
                    type="button"
                    disabled={!canManage || !scheduleDate || publishing}
                    onClick={() => publish.mutate()}
                    className="md:col-span-3 rounded-full bg-slate-900 font-bold text-white dark:bg-white dark:text-slate-900"
                  >
                    Confirm schedule
                  </Button>
                </div>
              ) : null}

              {(publishing || publishStep >= 0) && (
                <div className="space-y-2 rounded-2xl bg-[var(--muted)]/40 p-4">
                  {PUBLISH_STEPS.map((step, idx) => (
                    <div key={step} className="flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          idx <= publishStep ? "bg-[#6F42F5]" : "bg-slate-300",
                        )}
                      />
                      <span className={idx === publishStep ? "font-bold text-[#6F42F5]" : ""}>{step}</span>
                    </div>
                  ))}
                  {active.publish_log?.length ? (
                    <ul className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-xs">
                      {active.publish_log.map((entry, i) => (
                        <li key={`${entry.at}-${i}`} className={entry.ok ? "text-emerald-700" : "text-red-600"}>
                          {entry.step} {entry.detail ? `— ${entry.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </Card>
          </section>
        </>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {/* History */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Campaign History</h2>
        <Card className="overflow-x-auto !rounded-2xl !p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Platforms</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-[var(--muted-fg)]">
                    Loading…
                  </td>
                </tr>
              ) : null}
              {(history.data?.results || []).map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)] align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{row.title || "Untitled"}</td>
                  <td className="px-4 py-3">{(row.platforms || []).join(", ")}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-bold uppercase">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.published_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.scheduled_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs font-bold text-[#6F42F5] hover:underline"
                        onClick={() => {
                          setActive(row);
                          setError("");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Preview
                      </button>
                      {canManage ? (
                        <button
                          type="button"
                          className="text-xs font-bold text-slate-700 hover:underline dark:text-slate-200"
                          onClick={() => republish.mutate(row.id)}
                        >
                          Republish
                        </button>
                      ) : null}
                      {canManage ? (
                        <button
                          type="button"
                          className="text-xs font-bold text-red-600 hover:underline"
                          onClick={() => remove.mutate(row.id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!history.isLoading && !(history.data?.results || []).length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-[var(--muted-fg)]">
                    No campaigns yet — generate your first AI campaign above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
