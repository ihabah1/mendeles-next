"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CampaignNetworkSimulator } from "@/components/social/campaign-network-simulator";
import { useAuth } from "@/lib/auth/auth-context";
import {
  socialApi,
  type SocialCampaign,
  type SocialPlatform,
} from "@/lib/api/social";
import { createTikTokPromoVideo } from "@/lib/social/create-tiktok-video";
import { PROMO_VIDEOS, type PromoVideoId } from "@/lib/marketing/promo-videos";
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

/** Real Buffer-ready raster only — SVG and placehold fillers are blocked. */
function isRasterCreative(url: string | null | undefined) {
  if (!url) return false;
  if (/placehold\.co/i.test(url)) return false;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
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
  const [tiktokCount, setTiktokCount] = useState(1);
  const [selectedPromoIds, setSelectedPromoIds] = useState<PromoVideoId[]>([]);
  const [useSitePromoVideos, setUseSitePromoVideos] = useState(false);

  const [localCreativeProgress, setLocalCreativeProgress] = useState(0);
  const [localCreativeLog, setLocalCreativeLog] = useState<Array<{ level: string; message: string }>>([]);
  const [localCreativeBusy, setLocalCreativeBusy] = useState(false);

  const creativePoll = useQuery({
    queryKey: ["campaign-creatives", active?.id],
    queryFn: () => socialApi.get(active!.id),
    enabled: Boolean(active?.id) && (Boolean(active?.tiktok_generating) || localCreativeBusy),
    refetchInterval: 1500,
  });

  useEffect(() => {
    if (creativePoll.data) {
      setActive(creativePoll.data);
    }
  }, [creativePoll.data]);

  function isPlayableVideo(url: string) {
    return /\.(mp4|webm)(\?|$)/i.test(url || "");
  }

  function bestTikTokVideoUrl(campaign: SocialCampaign | null | undefined) {
    if (!campaign) return "";
    const fromList = [...(campaign.tiktok_videos || [])]
      .reverse()
      .find((v) => isPlayableVideo(v.url))?.url;
    if (fromList) return fromList;
    if (isPlayableVideo(campaign.tiktok_video_url || "")) return campaign.tiktok_video_url;
    return campaign.tiktok_video_url || "";
  }

  function pushLocalLog(message: string, level = "info") {
    setLocalCreativeLog((prev) => [...prev.slice(-80), { level, message }]);
  }

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
    onSuccess: async (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      if (data.platforms?.includes("tiktok") && data.id) {
        qc.invalidateQueries({ queryKey: ["campaign-creatives", data.id] });
        // Immediately create one playable WebM so Play works after Generate.
        try {
          setLocalCreativeBusy(true);
          setLocalCreativeProgress(10);
          setLocalCreativeLog([{ level: "info", message: "Recording playable TikTok video after Generate…" }]);
          const dataUrl = await createTikTokPromoVideo({
            title: data.title || data.main_idea || "Mendeles",
            cta: data.cta || "Learn more",
            websiteUrl: data.website_url || websiteUrl,
          });
          setLocalCreativeProgress(70);
          const updated = await socialApi.uploadTikTokVideo(data.id, dataUrl);
          setActive(updated);
          setLocalCreativeProgress(100);
          pushLocalLog("Playable TikTok video ready — press Play", "success");
        } catch (err) {
          pushLocalLog(
            `Auto TikTok video failed: ${err instanceof Error ? err.message : "error"} — use Generate videos below`,
            "warn",
          );
        } finally {
          setLocalCreativeBusy(false);
        }
      }
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

  const prepareAndSimulate = async (): Promise<SocialCampaign> => {
    if (!active?.id) throw new Error("No campaign");
    await saveEdits.mutateAsync();
    const platformsSelected = active.platforms?.length ? active.platforms : platforms;
    let campaign = active;
    const needsPng =
      platformsSelected.includes("instagram") ||
      platformsSelected.includes("linkedin") ||
      (platformsSelected.includes("tiktok") && !isPlayableVideo(campaign.tiktok_video_url || ""));

    if (needsPng && !isRasterCreative(campaign.instagram_image_url || campaign.media_url)) {
      campaign = await socialApi.createInstagramImage(campaign.id);
      if (!isRasterCreative(campaign.instagram_image_url || campaign.media_url)) {
        throw new Error(
          "חסרה תמונת PNG. Create Instagram image חייב להחזיר PNG (לא SVG). בדקו ש-Gemini מוגדר, ואז נסו שוב.",
        );
      }
    }
    if (platformsSelected.includes("tiktok")) {
      if (useSitePromoVideos && selectedPromoIds.length > 0) {
        campaign = await socialApi.attachSitePromoVideos(campaign.id, selectedPromoIds);
      } else if (!isPlayableVideo(campaign.tiktok_video_url || "")) {
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
    }
    const result = await socialApi.simulate(campaign.id);
    if (result.status !== "simulated") {
      throw new Error(result.last_error || "הסימולציה נכשלה — בדקו כותרות וקריאייטיבים.");
    }
    return result;
  };

  const simulate = useMutation({
    mutationFn: prepareAndSimulate,
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setPublishStep(-1);
      setError("");
      requestAnimationFrame(() => {
        document.getElementById("campaign-release")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    onError: (err: Error) => setError(err.message || "Simulation failed"),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      // Always save + simulate first so the gate never blocks with a stale "required" error.
      setPublishStep(0);
      const simulatedCampaign = await prepareAndSimulate();
      setActive(simulatedCampaign);
      const campaignId = simulatedCampaign.id;
      const scheduledAt =
        scheduleMode && scheduleDate
          ? new Date(`${scheduleDate}T${scheduleTime || "10:00"}:00`).toISOString()
          : undefined;
      setPublishStep(1);
      const timers = PUBLISH_STEPS.map((_, idx) =>
        window.setTimeout(() => setPublishStep(Math.max(1, idx)), idx * 700),
      );
      try {
        return await socialApi.publish({
          campaign_id: campaignId,
          mode: scheduleMode ? "schedule" : "now",
          scheduled_at: scheduledAt,
          timezone,
        });
      } finally {
        timers.forEach((t) => window.clearTimeout(t));
      }
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      if (data.status === "failed") {
        setPublishStep(-1);
        setError(data.last_error || "Publish failed");
      } else {
        setPublishStep(PUBLISH_STEPS.length - 1);
        setError("");
      }
    },
    onError: (err: Error) => {
      setPublishStep(-1);
      setError(err.message || "Publish failed");
    },
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

  const attachSitePromos = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      if (!selectedPromoIds.length) throw new Error("בחרו לפחות סרטון תדמית אחד.");
      await saveEdits.mutateAsync();
      return socialApi.attachSitePromoVideos(active.id, selectedPromoIds);
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setUseSitePromoVideos(true);
      setError("");
    },
    onError: (err: Error) => setError(err.message || "Failed to attach site promo videos"),
  });

  const generateAiTikToks = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();

      const count = Math.max(1, Math.min(20, tiktokCount));
      setLocalCreativeBusy(true);
      setLocalCreativeProgress(2);
      setLocalCreativeLog([]);
      pushLocalLog(`Starting ${count} playable TikTok video(s)…`);

      let campaign = active;
      let made = 0;
      const haveAiProvider = (videoProviders.data?.providers || []).some(
        (p) => p.available && p.provider !== "local",
      );

      // Reliable path: browser WebM (always playable). Server AI/threads often fail in prod.
      for (let i = 0; i < count; i++) {
        const n = i + 1;
        setLocalCreativeProgress(Math.round((i / count) * 85) + 5);
        pushLocalLog(`Video ${n}/${count}: recording WebM in browser…`);
        try {
          const dataUrl = await createTikTokPromoVideo({
            title: `${campaign.title || campaign.main_idea || "Mendeles"} · ${n}`,
            cta: campaign.cta || "Learn more",
            websiteUrl: campaign.website_url || websiteUrl,
            durationMs: 4200 + i * 200,
          });
          pushLocalLog(`Video ${n}/${count}: uploading…`);
          campaign = await socialApi.uploadTikTokVideo(campaign.id, dataUrl);
          setActive(campaign);
          made += 1;
          pushLocalLog(`Video ${n}/${count}: ready (browser WebM)`, "success");
        } catch (err) {
          pushLocalLog(
            `Video ${n}/${count}: browser record failed — ${err instanceof Error ? err.message : "error"}`,
            "warn",
          );
        }
        setLocalCreativeProgress(Math.round((n / count) * 90));
      }

      if (made === 0 && haveAiProvider) {
        pushLocalLog("Browser failed — trying Veo/Runway sync (may take a few minutes)…", "warn");
        campaign = await socialApi.generateAiTikTokVideos(campaign.id, Math.min(count, 2));
        setActive(campaign);
        made = (campaign.tiktok_videos || []).filter((v) => /\.(mp4|webm)(\?|$)/i.test(v.url)).length;
      } else if (made === 0) {
        pushLocalLog("Falling back to server preview creative…", "warn");
        campaign = await socialApi.uploadTikTokVideo(campaign.id, "");
        setActive(campaign);
      }

      setLocalCreativeProgress(100);
      pushLocalLog(`Done — ${made || (campaign.tiktok_videos || []).length} file(s)`, made ? "success" : "warn");
      return campaign;
    },
    onSuccess: (data) => {
      setActive(data);
      setLocalCreativeBusy(false);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      qc.invalidateQueries({ queryKey: ["social-video-providers"] });
      qc.invalidateQueries({ queryKey: ["campaign-creatives", data.id] });
      const playable = (data.tiktok_videos || []).some((v) => isPlayableVideo(v.url)) || isPlayableVideo(data.tiktok_video_url || "");
      if (!playable) {
        setError("No playable video was created. Allow camera/mic permissions are not needed — try again, or use Chrome/Edge.");
      } else {
        setError("");
      }
    },
    onError: (err: Error) => {
      setLocalCreativeBusy(false);
      setLocalCreativeProgress(100);
      pushLocalLog(err.message || "Generation failed", "error");
      setError(err.message || "AI TikTok generation failed");
    },
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
          Generate creatives, preview how the campaign looks on LinkedIn / Instagram / TikTok, then release — nothing goes live until simulation passes.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { n: "1", label: "Generate" },
            { n: "2", label: "Instagram + TikTok creatives" },
            { n: "3", label: "סימולציה — 3 רשתות" },
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
            Create playable TikTok videos (WebM) you can press Play on immediately. If Runway/Veo are configured,
            they can upgrade quality; otherwise browser + local preview still produces usable clips.
          </p>
          {!hasCampaign ? <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{needCampaignHint}</p> : null}

          {hasCampaign && bestTikTokVideoUrl(active) ? (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4">
              <p className="text-sm font-semibold">
                {isPlayableVideo(bestTikTokVideoUrl(active))
                  ? "TikTok video — auto-plays (press controls for sound)"
                  : "TikTok preview image only (not a video yet — click Generate below)"}
              </p>
              <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
                {isPlayableVideo(bestTikTokVideoUrl(active)) ? (
                  <video
                    key={bestTikTokVideoUrl(active)}
                    src={bestTikTokVideoUrl(active)}
                    controls
                    playsInline
                    autoPlay
                    muted
                    loop
                    className="aspect-[9/16] w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bestTikTokVideoUrl(active)}
                    alt="TikTok creative"
                    className="aspect-[9/16] w-full object-cover"
                  />
                )}
              </div>
            </div>
          ) : null}

          {hasCampaign && (localCreativeBusy || active?.tiktok_generating) ? (
            <div className="space-y-2 rounded-xl border border-[#6F42F5]/30 bg-[#6F42F5]/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#6F42F5]">Generating TikTok video…</span>
                <span className="font-bold">
                  {localCreativeBusy ? localCreativeProgress : active?.creative_progress ?? 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className="h-full rounded-full bg-[#6F42F5] transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      localCreativeBusy ? localCreativeProgress : active?.creative_progress || 0,
                    )}%`,
                  }}
                />
              </div>
              <ul className="max-h-44 space-y-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 font-mono text-xs">
                {(localCreativeLog.length
                  ? localCreativeLog
                  : (active?.creative_log || []).map((l) => ({ level: l.level, message: l.message }))
                ).map((line, i) => (
                  <li
                    key={`${line.message}-${i}`}
                    className={cn(
                      line.level === "error" && "text-red-600",
                      line.level === "warn" && "text-amber-700",
                      line.level === "success" && "text-emerald-700",
                    )}
                  >
                    {line.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 space-y-3">
            <label className="flex items-start gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[var(--border)]"
                checked={useSitePromoVideos}
                disabled={!canManage || !hasCampaign}
                onChange={(e) => {
                  const on = e.target.checked;
                  setUseSitePromoVideos(on);
                  if (on && selectedPromoIds.length === 0) {
                    setSelectedPromoIds(PROMO_VIDEOS.map((v) => v.id));
                  }
                }}
              />
              <span>
                Use site promo videos for TikTok
                <span className="mt-0.5 block text-xs font-normal text-[var(--muted-fg)]">
                  Alternative to AI/browser clips — attach the Mendeles landing demos from the website.
                </span>
              </span>
            </label>

            {useSitePromoVideos ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PROMO_VIDEOS.map((video) => {
                    const checked = selectedPromoIds.includes(video.id);
                    return (
                      <label
                        key={video.id}
                        className={cn(
                          "cursor-pointer overflow-hidden rounded-xl border bg-[var(--background)] transition",
                          checked ? "border-[#6F42F5] ring-1 ring-[#6F42F5]/40" : "border-[var(--border)]",
                        )}
                      >
                        <div className="aspect-video bg-black">
                          <video
                            className="h-full w-full object-cover"
                            src={video.src}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        </div>
                        <div className="flex items-start gap-2 p-3">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-[var(--border)]"
                            checked={checked}
                            disabled={!canManage || !hasCampaign}
                            onChange={(e) => {
                              setSelectedPromoIds((prev) =>
                                e.target.checked
                                  ? [...prev, video.id]
                                  : prev.filter((id) => id !== video.id),
                              );
                            }}
                          />
                          <span className="text-xs font-medium leading-snug">{video.title}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    !canManage ||
                    !hasCampaign ||
                    !selectedPromoIds.length ||
                    attachSitePromos.isPending
                  }
                  onClick={() => attachSitePromos.mutate()}
                  className="rounded-full"
                >
                  {attachSitePromos.isPending
                    ? "Attaching…"
                    : `Attach ${selectedPromoIds.length || 0} promo video(s) to TikTok`}
                </Button>
              </>
            ) : null}
          </div>

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
              disabled={!canManage || !hasCampaign || createTikTok.isPending || useSitePromoVideos}
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
              disabled={
                !canManage ||
                !hasCampaign ||
                generateAiTikToks.isPending ||
                useSitePromoVideos
              }
              onClick={() => generateAiTikToks.mutate()}
              className="rounded-full bg-[#6F42F5] font-bold text-white hover:bg-[#5a32d4]"
            >
              {generateAiTikToks.isPending || localCreativeBusy
                ? `Creating… ${localCreativeProgress}%`
                : `Generate ${tiktokCount} TikTok videos`}
            </Button>
          </div>
          <div className="grid gap-3 text-xs text-[var(--muted-fg)] md:grid-cols-2">
            <p>
              Instagram:{" "}
              <span
                className={
                  isRasterCreative(active?.instagram_image_url || active?.media_url)
                    ? "font-semibold text-emerald-700"
                    : active?.instagram_image_url
                      ? "font-semibold text-amber-700"
                      : ""
                }
              >
                {isRasterCreative(active?.instagram_image_url || active?.media_url)
                  ? "Ready (PNG)"
                  : active?.instagram_image_url
                    ? "SVG only — generate PNG before publish"
                    : "Not created yet"}
              </span>
            </p>
            <p>
              TikTok:{" "}
              <span
                className={
                  active?.tiktok_video_url && isPlayableVideo(active.tiktok_video_url)
                    ? "font-semibold text-emerald-700"
                    : active?.tiktok_video_url
                      ? "font-semibold text-amber-700"
                      : ""
                }
              >
                {active?.tiktok_video_url
                  ? isPlayableVideo(active.tiktok_video_url)
                    ? `Playable video (${(active.tiktok_videos || []).filter((v) => isPlayableVideo(v.url)).length || 1})`
                    : "Preview only (SVG) — generate videos below"
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

      <section id="campaign-simulation" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">3 · סימולציה — כך ייראה הקמפיין</h2>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">
            לפני השליחה לרשת: צפו איך הפוסט נראה בלינקדאין, אינסטגרם וטיקטוק. אחר כך הריצו בדיקת סימולציה כדי לפתוח את כפתור השליחה.
          </p>
        </div>
        <Card className="space-y-6 !rounded-2xl">
          {!hasCampaign ? (
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{needCampaignHint}</p>
          ) : active ? (
            <>
              <CampaignNetworkSimulator
                campaign={active}
                platforms={active.platforms?.length ? active.platforms : platforms}
              />
              <div className="border-t border-[var(--border)] pt-4 space-y-4">
                <p className="text-sm text-[var(--muted-fg)]">
                  בדיקת מוכנות (כותרות, קריאייטיבים, קישורים) — חובה לפני &quot;שלח קמפיין לרשת&quot;.
                </p>
                <Button
                  type="button"
                  disabled={!canManage || !hasCampaign || simulate.isPending}
                  onClick={() => simulate.mutate()}
                  className="rounded-full bg-[#6F42F5] px-6 font-bold text-white hover:bg-[#5a32d4]"
                >
                  {simulate.isPending ? "מריץ סימולציה…" : "✓ אשר סימולציה והמשך לשליחה"}
                </Button>
                {active.simulation_log?.length ? (
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
                    הסימולציה עברה בהצלחה
                    {active.simulated_at ? ` · ${formatDate(active.simulated_at)}` : ""} — אפשר לשלוח לרשת.
                  </p>
                ) : (
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    יש לאשר סימולציה לפני שליחת הקמפיין.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </Card>
      </section>

      <section id="campaign-release" className="space-y-4">
        <h2 className="text-xl font-bold">4 · שליחה לרשת</h2>
        <Card className="space-y-4 !rounded-2xl border-red-200/80 dark:border-red-900/50">
          {!hasCampaign ? (
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{needCampaignHint}</p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  {simulated
                    ? "סימולציה אושרה — כך ייראה הקמפיין לפני שליחה:"
                    : "לפני שליחה — כך ייראה הקמפיין ב־3 הרשתות. אפשר לאשר סימולציה או ללחוץ שלח (יריץ סימולציה אוטומטית):"}
                </p>
                <CampaignNetworkSimulator
                  campaign={active!}
                  platforms={active!.platforms?.length ? active!.platforms : platforms}
                />
              </div>

              {!simulated ? (
                <div className="flex flex-wrap gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <Button
                    type="button"
                    disabled={!canManage || simulate.isPending || publishing}
                    onClick={() => simulate.mutate()}
                    className="rounded-full bg-[#6F42F5] px-6 font-bold text-white hover:bg-[#5a32d4]"
                  >
                    {simulate.isPending ? "מריץ סימולציה…" : "✓ אשר סימולציה"}
                  </Button>
                  <p className="w-full text-xs text-amber-900 dark:text-amber-100">
                    או לחצו ישירות על &quot;שלח קמפיין לרשת&quot; — הסימולציה תרוץ אוטומטית ואז תישלח.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  הסימולציה עברה — אפשר לשלוח את הקמפיין לרשת.
                </p>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={!canManage || !hasCampaign || publishing || simulate.isPending}
              onClick={() => {
                setScheduleMode(false);
                publish.mutate();
              }}
              className="rounded-full bg-red-600 px-6 font-bold text-white hover:bg-red-700 disabled:bg-red-600/40"
            >
              {publishing
                ? !simulated
                  ? "מריץ סימולציה ושולח…"
                  : "שולח…"
                : "שלח קמפיין לרשת"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canManage || !hasCampaign || publishing || simulate.isPending}
              onClick={() => setScheduleMode(true)}
              className="rounded-full"
            >
              תזמון שליחה
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
                disabled={!canManage || !hasCampaign || !scheduleDate || publishing || simulate.isPending}
                onClick={() => publish.mutate()}
                className="md:col-span-3 rounded-full bg-red-600 font-bold text-white hover:bg-red-700 disabled:bg-red-600/40"
              >
                Confirm scheduled release
              </Button>
            </div>
          ) : null}

          {publishing || (publishStep >= 0 && active?.status !== "failed" && !/simulation required/i.test(error || "")) ? (
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
              {active?.publish_log?.length && !/simulation required/i.test(active.last_error || "") ? (
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
          {/חסרה תמונת PNG|Campaign PNG|Create Instagram image/i.test(error) ? (
            <div className="space-y-1">
              <p className="font-bold">נדרשת תמונת PNG לפני שליחה</p>
              <p>
                SVG או תמונת מילוי (placeholder) לא נשלחים ל-Buffer. לחצו Create Instagram image עד שמופיע Ready
                (PNG), ואז סימולציה מחדש.
              </p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          ) : /internal server error|upstream_html_error|שגיאת שרת פנימית/i.test(error) ? (
            <div className="space-y-1">
              <p className="font-bold">שגיאת שרת בפרסום</p>
              <p>{error}</p>
              <p className="text-xs opacity-90">
                בלוגי ה-backend חפשו: social_publish_crash / social_publish_step / buffer_create_post /
                unhandled_api_error
              </p>
            </div>
          ) : /rate_limit|too many requests|חסם את ה-api|429/i.test(error) ? (
            <div className="space-y-1">
              <p className="font-bold">Buffer חסם פרסום ל־24 שעות (מגבלת קצב)</p>
              <p>{error}</p>
              <p className="text-xs opacity-90">
                אל תלחצו שוב על שליחה בינתיים — כל ניסיון נוסף שורף מכסה. נסו שוב מחר, או בדקו מגבלות API בחשבון Buffer.
              </p>
            </div>
          ) : /image url is not accessible|unable to connect to the server/i.test(error) ? (
            <div className="space-y-1">
              <p className="font-bold">Buffer לא הצליח לטעון את התמונה</p>
              <p>
                כתובת הקריאייטיב לא נגישה מבחוץ (או שזו קובץ SVG). מנסים כעת לפרסם עם תמונת PNG ציבורית — צרו מחדש
                קריאייטיב ואז שלחו שוב אחרי הפריסה.
              </p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          ) : /instagram posts require a type|require a type \(post/i.test(error) ? (
            <div className="space-y-1">
              <p className="font-bold">חסר סוג פוסט לאינסטגרם</p>
              <p>תוקן בשרת (סוג: post). פרסמו מחדש אחרי העדכון.</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          ) : (
            error
          )}
        </div>
      ) : null}

      {status.data?.error && /rate_limit|too many requests|חסם את ה-api|429/i.test(status.data.error) ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-bold">Buffer API rate limit פעיל</p>
          <p className="mt-1 text-xs">{status.data.error}</p>
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
