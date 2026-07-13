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
import { createTikTokPromoVideo } from "@/lib/social/create-tiktok-video";
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
  "Creating attractive campaign image...",
  "Finishing creatives...",
];

const PUBLISH_STEPS = [
  "Simulation gate...",
  "Preparing media...",
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
  const [tiktokCount, setTiktokCount] = useState(5);

  const status = useQuery({
    queryKey: ["social-status"],
    queryFn: socialApi.status,
    enabled: canView,
  });

  const videoProviders = useQuery({
    queryKey: ["social-video-providers"],
    queryFn: socialApi.videoProviders,
    enabled: canView,
    refetchInterval: 15000,
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
        tiktok_video_count: platforms.includes("tiktok") ? tiktokCount : undefined,
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
      if (data.status === "failed") setError(data.last_error || "Republish failed");
    },
    onError: (err: Error) => setError(err.message),
  });

  const createIgImage = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      return socialApi.createInstagramImage(active.id);
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setError("");
    },
    onError: (err: Error) => setError(err.message || "Instagram image failed"),
  });

  const createTikTok = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      try {
        const dataUrl = await createTikTokPromoVideo({
          title: active.title || active.main_idea || "Mendeles",
          cta: active.cta || "Learn more",
          websiteUrl: active.website_url || websiteUrl,
        });
        return await socialApi.uploadTikTokVideo(active.id, dataUrl);
      } catch {
        // Browser recording unsupported — server generates vertical creative.
        return socialApi.uploadTikTokVideo(active.id, "");
      }
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setError("");
    },
    onError: (err: Error) => setError(err.message || "TikTok video failed"),
  });

  const generateAiTikToks = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      return socialApi.generateAiTikTokVideos(active.id, tiktokCount);
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      qc.invalidateQueries({ queryKey: ["social-video-providers"] });
      const gen = data.ai_generation as { generated?: number; failed?: number } | undefined;
      if (gen?.failed && !gen.generated) {
        setError("AI TikTok generation failed on all providers");
      } else {
        setError("");
      }
    },
    onError: (err: Error) => setError(err.message || "AI TikTok generation failed"),
  });

  const simulate = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      const platformsSelected = active.platforms?.length ? active.platforms : platforms;
      let campaign = active;
      if (platformsSelected.includes("instagram") && !campaign.instagram_image_url) {
        campaign = await socialApi.createInstagramImage(campaign.id);
      }
      if (platformsSelected.includes("tiktok") && !campaign.tiktok_video_url) {
        try {
          const dataUrl = await createTikTokPromoVideo({
            title: campaign.title || campaign.main_idea || "Mendeles",
            cta: campaign.cta || "Learn more",
            websiteUrl: campaign.website_url || websiteUrl,
          });
          campaign = await socialApi.uploadTikTokVideo(campaign.id, dataUrl);
        } catch {
          campaign = await socialApi.uploadTikTokVideo(campaign.id, "");
        }
      }
      return socialApi.simulate(campaign.id);
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      if (data.status !== "simulated") {
        setError(data.last_error || "Simulation failed — fix the checklist items.");
      } else {
        setError("");
      }
    },
    onError: (err: Error) => setError(err.message || "Simulation failed"),
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
  const hasCampaign = Boolean(active?.id);
  const simulated = Boolean(active?.simulated_at) || active?.status === "simulated";
  const needCampaignHint = "Generate a campaign above first — then these actions unlock.";

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6F42F5]">Automation</p>
        <h1 className="text-3xl font-extrabold tracking-tight">AI Automation</h1>
        <p className="max-w-2xl text-sm text-[var(--muted-fg)]">
          Generate creatives, run a simulation, then release to the network via Buffer — nothing goes live until simulation passes.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { n: "1", label: "Generate" },
            { n: "2", label: "Instagram + TikTok creatives" },
            { n: "3", label: "Simulation" },
            { n: "4", label: "שלח קמפיין לרשת" },
          ].map((step) => (
            <li
              key={step.n}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5",
                step.n === "4" ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" : "bg-[var(--muted)]/40",
              )}
            >
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white", step.n === "4" ? "bg-red-600" : "bg-[#6F42F5]")}>
                {step.n}
              </span>
              {step.label}
            </li>
          ))}
        </ol>
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
        <h2 className="text-xl font-bold">1 · Generate AI Campaign</h2>
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

          {platforms.includes("tiktok") ? (
            <label className="block text-sm font-medium">
              TikTok videos to create on Generate
              <input
                type="number"
                min={1}
                max={20}
                value={tiktokCount}
                onChange={(e) => setTiktokCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="mt-1 w-28 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
          ) : null}

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

      {/* Previews + edit — only when a campaign exists */}
      {hasCampaign && active ? (
        <>
          {(active.instagram_image_url || active.media_url) && !String(active.media_url || "").includes("placehold.co") ? (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">Campaign image</h2>
              <Card className="overflow-hidden !rounded-2xl !p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.instagram_image_url || active.media_url}
                  alt={active.title || "Campaign creative"}
                  className="mx-auto max-h-[520px] w-full max-w-xl object-contain bg-[#0F172A]"
                />
              </Card>
            </section>
          ) : null}

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
        </>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">2 · Creatives</h2>
        <Card className="space-y-4 !rounded-2xl">
          <p className="text-sm text-[var(--muted-fg)]">
            Creatives: Generate always builds the campaign image. Use the buttons below for more Instagram regenerations or AI TikTok videos.
            AI video failover: Runway → Veo 3.1 → local.
          </p>
          {!hasCampaign ? <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{needCampaignHint}</p> : null}

          {videoProviders.data?.providers?.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {videoProviders.data.providers.map((p) => (
                <div
                  key={p.provider}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    p.available ? "border-emerald-300/60 bg-emerald-500/5" : "border-[var(--border)] bg-[var(--muted)]/30",
                  )}
                >
                  <p className="font-bold uppercase">{p.provider}</p>
                  <p className="text-[var(--muted-fg)]">{p.message}</p>
                  <p>
                    credits:{" "}
                    {p.credits_remaining === null || p.credits_remaining === undefined
                      ? "unknown"
                      : p.credits_remaining}{" "}
                    · cost {p.cost_per_video}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!canManage || !hasCampaign || createIgImage.isPending}
              onClick={() => createIgImage.mutate()}
              className="rounded-full"
            >
              {createIgImage.isPending ? "Creating…" : "Create AI campaign image"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canManage || !hasCampaign || createTikTok.isPending}
              onClick={() => createTikTok.mutate()}
              className="rounded-full"
            >
              {createTikTok.isPending ? "Recording…" : "Quick TikTok (browser)"}
            </Button>
            <label className="text-sm font-medium">
              AI videos
              <input
                type="number"
                min={1}
                max={20}
                value={tiktokCount}
                onChange={(e) => setTiktokCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="ml-2 w-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1"
              />
            </label>
            <Button
              type="button"
              disabled={!canManage || !hasCampaign || generateAiTikToks.isPending}
              onClick={() => generateAiTikToks.mutate()}
              className="rounded-full bg-[#6F42F5] font-bold text-white hover:bg-[#5a32d4]"
            >
              {generateAiTikToks.isPending
                ? "Generating…"
                : `Generate ${tiktokCount} AI TikTok videos`}
            </Button>
          </div>
          <div className="grid gap-3 text-xs text-[var(--muted-fg)] md:grid-cols-2">
            <p>
              Instagram:{" "}
              <span className={active?.instagram_image_url ? "font-semibold text-emerald-700" : ""}>
                {active?.instagram_image_url ? "Ready" : "Not created yet"}
              </span>
            </p>
            <p>
              TikTok:{" "}
              <span className={active?.tiktok_video_url ? "font-semibold text-emerald-700" : ""}>
                {active?.tiktok_video_url
                  ? `Ready (${(active.tiktok_videos || []).length || 1} file(s))`
                  : "Not created yet"}
              </span>
            </p>
          </div>
          {(active?.tiktok_videos || []).length ? (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[var(--border)] p-3 text-xs">
              {active!.tiktok_videos!.map((v, i) => (
                <li key={`${v.url}-${i}`}>
                  #{v.variation || i + 1} · {v.provider || "?"} ·{" "}
                  <a href={v.url} target="_blank" rel="noreferrer" className="text-[#6F42F5] underline">
                    open
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">3 · Simulation</h2>
        <Card className="space-y-4 !rounded-2xl">
          <p className="text-sm text-[var(--muted-fg)]">
            Dry-run checks captions and creatives. Release stays locked until this passes.
          </p>
          {!hasCampaign ? <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{needCampaignHint}</p> : null}
          <Button
            type="button"
            disabled={!canManage || !hasCampaign || simulate.isPending}
            onClick={() => simulate.mutate()}
            className="rounded-full bg-[#6F42F5] px-6 font-bold text-white hover:bg-[#5a32d4]"
          >
            {simulate.isPending ? "Simulating…" : "Run simulation"}
          </Button>
          {active?.simulation_log?.length ? (
            <ul className="space-y-2 rounded-2xl border border-[var(--border)] p-4 text-sm">
              {active.simulation_log.map((entry, i) => (
                <li key={`${entry.step}-${i}`} className="flex gap-2">
                  <span className={entry.ok ? "text-emerald-600" : "text-red-600"}>{entry.ok ? "✓" : "✗"}</span>
                  <span>
                    <span className="font-semibold">{entry.step}</span>
                    {entry.detail ? ` — ${entry.detail}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {simulated ? (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Simulation passed{active?.simulated_at ? ` · ${formatDate(active.simulated_at)}` : ""}
            </p>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Simulation required before releasing the campaign.
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">4 · Release to network</h2>
        <Card className="space-y-4 !rounded-2xl border-red-200/80 dark:border-red-900/50">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={!canManage || !hasCampaign || !simulated || publishing}
              onClick={() => {
                setScheduleMode(false);
                publish.mutate();
              }}
              className="rounded-full bg-red-600 px-6 font-bold text-white hover:bg-red-700 disabled:bg-red-600/40"
            >
              {publishing ? "Sending…" : "שלח קמפיין לרשת"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canManage || !hasCampaign || !simulated}
              onClick={() => setScheduleMode(true)}
              className="rounded-full"
            >
              Schedule release
            </Button>
          </div>
          {!hasCampaign ? (
            <p className="text-xs text-[var(--muted-fg)]">{needCampaignHint}</p>
          ) : !simulated ? (
            <p className="text-xs text-[var(--muted-fg)]">
              The red release button unlocks only after a successful simulation.
            </p>
          ) : null}

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
                disabled={!canManage || !hasCampaign || !simulated || !scheduleDate || publishing}
                onClick={() => publish.mutate()}
                className="md:col-span-3 rounded-full bg-red-600 font-bold text-white hover:bg-red-700 disabled:bg-red-600/40"
              >
                Confirm scheduled release
              </Button>
            </div>
          ) : null}

          {(publishing || publishStep >= 0) && active ? (
            <div className="space-y-2 rounded-2xl bg-[var(--muted)]/40 p-4">
              {PUBLISH_STEPS.map((step, idx) => (
                <div key={step} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      idx <= publishStep ? "bg-red-600" : "bg-slate-300",
                    )}
                  />
                  <span className={idx === publishStep ? "font-bold text-red-600" : ""}>{step}</span>
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
          ) : null}
        </Card>
      </section>

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
