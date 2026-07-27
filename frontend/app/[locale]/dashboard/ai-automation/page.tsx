"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CampaignNetworkSimulator } from "@/components/social/campaign-network-simulator";
import { useAuth } from "@/lib/auth/auth-context";
import { Link } from "@/lib/i18n/navigation";
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

const PLATFORMS: { id: SocialPlatform; label: string; hint?: string }[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook", hint: "ישירות מ־Meta (לא Buffer)" },
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

function browserReadableCreativeUrl(url: string): string {
  const parsed = new URL(url, window.location.origin);
  // Django media is exposed through the public same-origin Next.js proxy.
  if (parsed.pathname.startsWith("/media/")) {
    return `${parsed.pathname}${parsed.search}`;
  }
  return parsed.toString();
}

async function rasterizeCreativeToPng(url: string): Promise<string> {
  const response = await fetch(browserReadableCreativeUrl(url), {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`לא ניתן לטעון את הקריאייטיב להמרה (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();

    const width = image.naturalWidth || 1080;
    const height = image.naturalHeight || 1080;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("הדפדפן לא הצליח לפתוח Canvas להמרת PNG.");
    context.drawImage(image, 0, 0, width, height);

    const png = canvas.toDataURL("image/png");
    if (!png.startsWith("data:image/png;base64,")) {
      throw new Error("המרת SVG ל-PNG נכשלה.");
    }
    return png;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function videoFileToDataUrl(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mime =
    file.type ||
    (extension === "mov" ? "video/quicktime" : extension === "mp4" ? "video/mp4" : "");
  if (!["video/mp4", "video/quicktime"].includes(mime)) {
    throw new Error("ניתן להעלות קובץ וידאו MP4 או MOV בלבד.");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("קובץ הווידאו גדול מדי. הגודל המרבי הוא 25MB.");
  }
  if (file.size < 64) throw new Error("קובץ הווידאו ריק או לא תקין.");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("קריאת קובץ הווידאו נכשלה."));
    reader.readAsDataURL(new Blob([file], { type: mime }));
  });
}

async function imageFileToDataUrl(file: File): Promise<string> {
  const mime = file.type || "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
    throw new Error("ניתן להעלות תמונת PNG, JPEG או WebP בלבד.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("קובץ התמונה גדול מדי. הגודל המרבי הוא 12MB.");
  }
  if (file.size < 64) throw new Error("קובץ התמונה ריק או לא תקין.");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("קריאת קובץ התמונה נכשלה."));
    reader.readAsDataURL(file);
  });
}

async function createGuaranteedPng(campaignId: string): Promise<SocialCampaign> {
  let campaign = await socialApi.createInstagramImage(campaignId);
  if (isRasterCreative(campaign.instagram_image_url || campaign.media_url)) return campaign;

  const source = campaign.instagram_image_url || campaign.media_url;
  if (!source) throw new Error("לא נוצר קריאייטיב שאפשר להמיר ל-PNG.");

  const pngDataUrl = await rasterizeCreativeToPng(source);
  campaign = await socialApi.uploadInstagramPng(campaignId, pngDataUrl);
  if (!isRasterCreative(campaign.instagram_image_url || campaign.media_url)) {
    throw new Error("השרת לא שמר את תמונת ה-PNG.");
  }
  return campaign;
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
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState(60);
  const [scheduleRepeatCount, setScheduleRepeatCount] = useState(1);
  const [sendFirstNow, setSendFirstNow] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [publishStep, setPublishStep] = useState(-1);
  const [error, setError] = useState("");
  const [tiktokCount, setTiktokCount] = useState(1);
  const [selectedPromoIds, setSelectedPromoIds] = useState<PromoVideoId[]>([]);
  const [useSitePromoVideos, setUseSitePromoVideos] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualVideoName, setManualVideoName] = useState("");
  const [republishIds, setRepublishIds] = useState<string[]>([]);
  const [republishStrategy, setRepublishStrategy] = useState<"random_one" | "shuffle_all">("random_one");
  const [republishIntervalMinutes, setRepublishIntervalMinutes] = useState(60);
  const [republishMode, setRepublishMode] = useState<"now" | "schedule" | "now_hourly">("now");
  const [cronIntervalHours, setCronIntervalHours] = useState(1);
  const [republishNotice, setRepublishNotice] = useState("");

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
    return /\.(mp4|webm|mov)(\?|$)/i.test(url || "");
  }

  function isBufferVideo(url: string) {
    return /\.(mp4|mov)(\?|$)/i.test(url || "");
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

  function bestInstagramVideoUrl(campaign: SocialCampaign | null | undefined) {
    if (!campaign) return "";
    if (isBufferVideo(campaign.instagram_video_url || "")) return campaign.instagram_video_url || "";
    if (isBufferVideo(campaign.campaign_video_url || campaign.tiktok_video_url || "")) {
      return campaign.campaign_video_url || campaign.tiktok_video_url;
    }
    return (
      [...(campaign.tiktok_videos || [])]
        .reverse()
        .find((video) => isBufferVideo(video.url))?.url || ""
    );
  }

  function platformImageUrl(campaign: SocialCampaign, platform: SocialPlatform) {
    if (platform === "linkedin") {
      return campaign.linkedin_image_url || campaign.instagram_image_url || campaign.media_url || "";
    }
    if (platform === "instagram") {
      return campaign.instagram_image_url || campaign.media_url || "";
    }
    if (platform === "facebook") {
      return (
        campaign.facebook_image_url ||
        campaign.linkedin_image_url ||
        campaign.instagram_image_url ||
        campaign.media_url ||
        ""
      );
    }
    return campaign.media_url || campaign.instagram_image_url || "";
  }

  function platformVideoUrl(campaign: SocialCampaign, platform: SocialPlatform) {
    if (platform === "linkedin") return campaign.linkedin_video_url || "";
    if (platform === "instagram") return bestInstagramVideoUrl(campaign);
    if (platform === "facebook") {
      return (
        campaign.facebook_video_url ||
        campaign.linkedin_video_url ||
        bestInstagramVideoUrl(campaign) ||
        bestTikTokVideoUrl(campaign) ||
        ""
      );
    }
    return bestTikTokVideoUrl(campaign);
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

  const republishCron = useQuery({
    queryKey: ["social-republish-cron"],
    queryFn: () => socialApi.republishCronStatus(),
    enabled: canView && canManage,
    refetchInterval: (q) => (q.state.data?.enabled ? 15_000 : 60_000),
  });

  useEffect(() => {
    if (!republishCron.data?.enabled) return;
    const id = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
    }, 30_000);
    return () => window.clearInterval(id);
  }, [republishCron.data?.enabled, qc]);

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
      setWizardStep(2);
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
        } catch {
          /* optional */
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
        instagram_media_type: active.instagram_media_type || "image",
        timezone,
        platforms: active.platforms?.length ? active.platforms : platforms,
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
      (platformsSelected.includes("instagram") && campaign.instagram_media_type !== "video") ||
      platformsSelected.includes("linkedin") ||
      (platformsSelected.includes("tiktok") && !isPlayableVideo(campaign.tiktok_video_url || ""));

    if (needsPng && !isRasterCreative(campaign.instagram_image_url || campaign.media_url)) {
      campaign = await createGuaranteedPng(campaign.id);
    }
    if (
      platformsSelected.includes("instagram") &&
      campaign.instagram_media_type === "video" &&
      !bestInstagramVideoUrl(campaign)
    ) {
      throw new Error("בחרתם וידאו לאינסטגרם. העלו קובץ MP4 או MOV לפני הסימולציה.");
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
      if (scheduleMode && !sendFirstNow && !scheduledAt) {
        throw new Error("בחרו תאריך ושעה לתזמון.");
      }
      if (scheduleMode && sendFirstNow && scheduleRepeatCount > 1 && !scheduledAt) {
        throw new Error("בחרו תאריך ושעה לשליחות הבאות אחרי השליחה הראשונה.");
      }
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
          send_first_now: scheduleMode ? sendFirstNow : false,
          interval_minutes: scheduleMode && scheduleRepeatCount > 1 ? scheduleIntervalMinutes : 0,
          repeat_count: scheduleMode ? scheduleRepeatCount : 1,
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

  const republishBatch = useMutation({
    mutationFn: async () => {
      if (republishIds.length === 0) throw new Error("בחרו לפחות קמפיין אחד שפורסם.");
      if (republishMode === "schedule" && !scheduleDate) {
        throw new Error("בחרו תאריך ושעה לתזמון הפרסום החוזר.");
      }
      const scheduledAt =
        republishMode === "schedule" && scheduleDate
          ? new Date(`${scheduleDate}T${scheduleTime || "10:00"}:00`).toISOString()
          : undefined;
      const batchMode = republishMode === "schedule" ? "schedule" : "now";
      const batch = await socialApi.republishBatch({
        campaign_ids: republishIds,
        strategy: republishStrategy,
        mode: batchMode,
        scheduled_at: scheduledAt,
        interval_minutes: republishIntervalMinutes,
        timezone,
      });
      if (batch.error) return { ...batch, cron: null as null };

      let cron = null as Awaited<ReturnType<typeof socialApi.setRepublishCron>> | null;
      if (republishMode === "now_hourly") {
        const okResults = (batch.results || []).filter((r) => r.status !== "failed");
        const failedResults = (batch.results || []).filter((r) => r.status === "failed");
        cron = await socialApi.setRepublishCron({
          enabled: true,
          interval_hours: Math.max(1, Math.min(720, cronIntervalHours || 1)),
          campaign_ids: republishIds,
          last_order: (okResults.length ? okResults : batch.results || [])
            .map((r) => r.id)
            .filter(Boolean),
          last_error: failedResults[0]?.last_error || "",
        });
        if (cron.error) {
          return {
            ...batch,
            error:
              okResults.length > 0
                ? `נשלח עכשיו, אבל הפעלת החזרה נכשלה: ${cron.error}`
                : cron.error,
            cron,
          };
        }
      }
      return { ...batch, cron };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      qc.invalidateQueries({ queryKey: ["social-republish-cron"] });
      if (data.error) {
        setRepublishNotice("");
        setError(data.error);
        return;
      }
      const failed = (data.results || []).filter((r) => r.status === "failed");
      const ok = (data.results || []).filter((r) => r.status !== "failed");
      if (failed.length) {
        const reason = failed[0]?.last_error || "חלק מהפרסומים החוזרים נכשלו.";
        const cronOn = Boolean(data.cron?.enabled);
        setRepublishNotice("");
        setError(
          cronOn
            ? `השליחה המיידית נכשלה: ${reason} החזרה האוטומטית הופעלה ותנסה שוב בריצה הבאה.`
            : reason,
        );
      } else {
        setError("");
        const first = ok[0];
        const when = first?.published_at ? formatDate(first.published_at) : formatDate(new Date().toISOString());
        const title = first?.title || "קמפיין";
        if (republishMode === "now_hourly") {
          setRepublishNotice(
            `נשלח עכשיו: «${title}» · ${when}. חזרה אוטומטית פעילה — ריצה הבאה בעוד כ־${cronIntervalHours} שע׳.`,
          );
        } else if (republishMode === "schedule") {
          setRepublishNotice(`תוזמן: «${title}».`);
        } else {
          setRepublishNotice(`נשלח עכשיו: «${title}» · ${when}.`);
        }
      }
      if (data.results?.[0]) setActive(data.results[0]);
      setRepublishIds([]);
    },
    onError: (err: Error) => setError(err.message || "פרסום חוזר נכשל"),
  });

  const setRepublishCron = useMutation({
    mutationFn: (enabled: boolean) =>
      socialApi.setRepublishCron({
        enabled,
        interval_hours: cronIntervalHours,
        campaign_ids: republishIds.length ? republishIds : undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["social-republish-cron"] });
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      if (data.error) setError(data.error);
      else setError("");
    },
    onError: (err: Error) => setError(err.message || "עדכון ה־CRON נכשל"),
  });

  useEffect(() => {
    if (republishCron.data?.interval_hours) {
      setCronIntervalHours(republishCron.data.interval_hours);
    }
  }, [republishCron.data?.interval_hours]);

  const createIgImage = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      return createGuaranteedPng(active.id);
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setError("");
    },
    onError: (err: Error) => setError(err.message || "Instagram image failed"),
  });

  const createAiImage = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      return socialApi.generateAiCampaignImage(active.id);
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setError("");
    },
    onError: (err: Error) => setError(err.message || "יצירת תמונת AI נכשלה"),
  });

  const ensureCampaignPlatforms = async (needed: SocialPlatform[]) => {
    if (!active?.id) throw new Error("No campaign");
    const current = active.platforms?.length ? active.platforms : platforms;
    const missing = needed.filter((p) => !current.includes(p));
    if (!missing.length) return active;
    const nextPlatforms = [...current, ...missing];
    const nextCaptions = { ...active.captions };
    for (const p of missing) {
      if (!nextCaptions[p]) {
        nextCaptions[p] =
          nextCaptions.linkedin || nextCaptions.instagram || nextCaptions.tiktok || nextCaptions.facebook || "";
      }
    }
    const updated = await socialApi.update(active.id, {
      platforms: nextPlatforms,
      captions: nextCaptions,
    });
    setActive(updated);
    setPlatforms(nextPlatforms);
    return updated;
  };

  const uploadPlatformMedia = useMutation({
    mutationFn: async (input: {
      platform?: SocialPlatform;
      platforms?: SocialPlatform[];
      kind: "image" | "video";
      file: File;
    }) => {
      if (!active?.id) throw new Error("No campaign");
      const targets =
        input.platforms?.length
          ? input.platforms
          : input.platform
            ? [input.platform]
            : (["linkedin", "instagram", "tiktok", "facebook"] as SocialPlatform[]);
      await ensureCampaignPlatforms(targets);
      const data_url =
        input.kind === "video"
          ? await videoFileToDataUrl(input.file)
          : await imageFileToDataUrl(input.file);
      setManualVideoName(input.file.name);
      let latest: SocialCampaign | null = null;
      for (const platform of targets) {
        latest = await socialApi.uploadPlatformMedia(active.id, {
          platform,
          kind: input.kind,
          data_url,
        });
      }
      if (!latest) throw new Error("העלאת המדיה נכשלה");
      return latest;
    },
    onSuccess: (data) => {
      setActive(data);
      if (data.platforms?.length) setPlatforms(data.platforms);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setError("");
    },
    onError: (err: Error) => setError(err.message || "העלאת המדיה נכשלה"),
  });

  const autoRelease = useMutation({
    mutationFn: async () => {
      if (!sendFirstNow || scheduleRepeatCount > 1) {
        if (!scheduleDate) throw new Error("בחרו תאריך ושעה לתזמון האוטומטי.");
      }
      if (!goal.trim() || platforms.length === 0) {
        throw new Error("מלאו מטרה ובחרו לפחות רשת אחת.");
      }
      setPublishStep(0);
      let campaign = active?.id ? active : null;
      if (!campaign?.id) {
        campaign = await socialApi.generate({
          goal,
          campaign_type: campaignType,
          tone,
          target_audience: audience,
          website_url: websiteUrl,
          media_type: mediaType,
          platforms,
          tiktok_video_count: platforms.includes("tiktok") ? tiktokCount : undefined,
        });
        setActive(campaign);
      }
      const scheduledAt =
        scheduleDate
          ? new Date(`${scheduleDate}T${scheduleTime || "10:00"}:00`).toISOString()
          : undefined;
      setPublishStep(2);
      return socialApi.publish({
        campaign_id: campaign.id,
        mode: "schedule",
        scheduled_at: scheduledAt,
        timezone,
        auto_release: true,
        send_first_now: sendFirstNow,
        interval_minutes: scheduleRepeatCount > 1 ? scheduleIntervalMinutes : 0,
        repeat_count: scheduleRepeatCount,
      });
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      if (data.status === "failed") {
        setPublishStep(-1);
        setError(data.last_error || "התזמון האוטומטי נכשל");
        if (!data.simulated_at) setWizardStep(3);
        else setWizardStep(4);
      } else {
        setPublishStep(PUBLISH_STEPS.length - 1);
        setError("");
        setWizardStep(4);
      }
    },
    onError: (err: Error) => {
      setPublishStep(-1);
      setError(err.message || "התזמון האוטומטי נכשל");
    },
  });

  /** One-click: generate PNG creative + re-run simulation so publish is unblocked. */
  const fixPngAndResim = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No campaign");
      await saveEdits.mutateAsync();
      let campaign = await createGuaranteedPng(active.id);
      setActive(campaign);
      if (useSitePromoVideos && selectedPromoIds.length > 0) {
        campaign = await socialApi.attachSitePromoVideos(campaign.id, selectedPromoIds);
        setActive(campaign);
      }
      const simulated = await socialApi.simulate(campaign.id);
      if (simulated.status !== "simulated") {
        throw new Error(simulated.last_error || "הסימולציה נכשלה אחרי יצירת PNG.");
      }
      return simulated;
    },
    onSuccess: (data) => {
      setActive(data);
      qc.invalidateQueries({ queryKey: ["social-campaigns"] });
      setError("");
      setWizardStep(3);
      requestAnimationFrame(() => {
        document.getElementById("campaign-simulation")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    onError: (err: Error) => setError(err.message || "יצירת PNG נכשלה"),
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
      requestAnimationFrame(() => {
        document.getElementById("campaign-simulation")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      // Refresh readiness checklist so the sim log shows site promo usage.
      void simulate.mutateAsync().catch(() => undefined);
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

  const publishedForRepublish = useMemo(
    () =>
      (history.data?.results || []).filter(
        (row) =>
          row.status === "published" ||
          row.status === "scheduled" ||
          Boolean(row.published_at) ||
          (row.buffer_update_ids && Object.keys(row.buffer_update_ids).length > 0),
      ),
    [history.data?.results],
  );

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
  const hasPng = isRasterCreative(active?.instagram_image_url || active?.media_url);
  const hasTikTokMedia =
    Boolean(active && isPlayableVideo(bestTikTokVideoUrl(active))) ||
    (active?.tiktok_videos || []).some((v) => v.provider === "site_promo");
  const campaignPlatforms = active?.platforms?.length ? active.platforms : platforms;
  const hasCampaignVideo = Boolean(bestInstagramVideoUrl(active));
  const instagramUsesVideo =
    campaignPlatforms.includes("instagram") && active?.instagram_media_type === "video";
  const campaignNeedsPng =
    campaignPlatforms.includes("linkedin") ||
    (campaignPlatforms.includes("instagram") && !instagramUsesVideo) ||
    (campaignPlatforms.includes("tiktok") && !hasTikTokMedia);
  const campaignCreativesReady =
    (!campaignNeedsPng || hasPng) &&
    (!instagramUsesVideo || hasCampaignVideo) &&
    (!campaignPlatforms.includes("tiktok") || hasTikTokMedia);
  const geminiEnabled = status.data?.gemini_enabled !== false;
  const isPublished = active?.status === "published";
  const isScheduled = active?.status === "scheduled";
  const publishedPlatforms = Object.keys(active?.buffer_update_ids || {});
  const pngBlocked = /חסרה תמונת PNG|Campaign PNG|Create Instagram image/i.test(error || "");
  const needCampaignHint = "צרו קמפיין בשלב 1 — ואז הפעולות כאן ייפתחו.";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6F42F5]">Automation</p>
          <h1 className="text-3xl font-extrabold tracking-tight">אוטומציית קמפיין</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted-fg)]">
            פלואו פשוט: יצירת תוכן → מדיה לפי רשת → סימולציה → אישור ושחרור. או תזמון אוטומטי בלחיצה אחת.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/dashboard/campaign-report" className="font-semibold text-[#6F42F5] hover:underline">
              דוח כניסות אחרי פרסום קמפיין →
            </Link>
          </p>
        </div>
        <nav className="grid gap-2 sm:grid-cols-4" aria-label="שלבי קמפיין">
          {[
            { n: 1 as const, label: "תוכן", hint: "יצירה / טעינה" },
            { n: 2 as const, label: "מדיה", hint: "תמונה/וידאו לרשת" },
            { n: 3 as const, label: "סימולציה", hint: "תצוגה מקדימה" },
            { n: 4 as const, label: "אישור ושחרור", hint: "פרסום או תזמון" },
          ].map((s) => {
            const locked = s.n > 1 && !hasCampaign;
            const done =
              (s.n === 1 && hasCampaign) ||
              (s.n === 2 && hasCampaign && campaignCreativesReady) ||
              (s.n === 3 && simulated) ||
              (s.n === 4 && (active?.status === "published" || active?.status === "scheduled"));
            return (
              <button
                key={s.n}
                type="button"
                disabled={locked}
                onClick={() => setWizardStep(s.n)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-start transition",
                  wizardStep === s.n
                    ? "border-[#6F42F5] bg-[#6F42F5]/10 shadow-sm"
                    : "border-[var(--border)] bg-[var(--background)] hover:border-[#6F42F5]/40",
                  locked && "opacity-40",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                      done ? "bg-emerald-600" : wizardStep === s.n ? "bg-[#6F42F5]" : "bg-slate-400",
                    )}
                  >
                    {done ? "✓" : s.n}
                  </span>
                  <span className="font-bold">{s.label}</span>
                </span>
                <span className="mt-1 block text-xs text-[var(--muted-fg)]">{s.hint}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-full px-3 py-1 font-semibold",
              status.data?.buffer_configured
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
            )}
          >
            Buffer: {status.data?.buffer_configured ? "מחובר" : "לא מוגדר"}
          </span>
          <span
            className={cn(
              "rounded-full px-3 py-1 font-semibold",
              status.data?.facebook_configured
                ? "bg-sky-500/15 text-sky-800 dark:text-sky-200"
                : "bg-slate-500/15 text-slate-700 dark:text-slate-300",
            )}
          >
            Facebook:{" "}
            {status.data?.facebook_configured
              ? status.data.facebook_page || "מחובר"
              : "לא מוגדר"}
          </span>
          {!geminiEnabled ? (
            <span className="rounded-full bg-slate-500/15 px-3 py-1 font-semibold text-slate-700 dark:text-slate-300">
              Gemini AI מושבת
            </span>
          ) : null}
          {hasCampaign ? (
            <span className="rounded-full bg-[var(--muted)] px-3 py-1 font-semibold">
              {instagramUsesVideo
                ? hasCampaignVideo
                  ? "Instagram Reel ✓"
                  : "חסר וידאו לאינסטגרם"
                : hasPng
                  ? "PNG ✓"
                  : "חסר PNG"}{" "}
              · {hasCampaignVideo || hasTikTokMedia ? "וידאו ✓" : "אין וידאו"} ·{" "}
              {simulated ? "סימולציה ✓" : "טרם אושר"}
            </span>
          ) : null}
          {isPublished ? (
            <span className="rounded-full bg-emerald-600 px-3 py-1 font-bold text-white shadow-sm">
              ● הקמפיין באוויר
            </span>
          ) : isScheduled ? (
            <span className="rounded-full bg-sky-600 px-3 py-1 font-bold text-white">
              ◷ הקמפיין מתוזמן
            </span>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {pngBlocked || /חסרה תמונת PNG|Campaign PNG|Create Instagram image/i.test(error) ? (
            <div className="space-y-3">
              <div>
                <p className="font-bold text-base">חסרה תמונת PNG — אפשר לתקן בלחיצה אחת</p>
                <p className="mt-1 text-sm opacity-90">
                  ניצור תמונת קמפיין ב־PNG ונריץ סימולציה מחדש כדי לאפשר שליחה.
                </p>
              </div>
              <Button
                type="button"
                disabled={!canManage || !hasCampaign || fixPngAndResim.isPending}
                onClick={() => fixPngAndResim.mutate()}
                className="rounded-full bg-[#6F42F5] px-6 font-bold text-white hover:bg-[#5a32d4]"
              >
                {fixPngAndResim.isPending ? "יוצר PNG ומריץ סימולציה…" : "צור תמונת PNG ותקן עכשיו"}
              </Button>
              <p className="text-xs opacity-70">{error}</p>
            </div>
          ) : /internal server error|upstream_html_error|שגיאת שרת פנימית/i.test(error) ? (
            <div className="space-y-1">
              <p className="font-bold">שגיאת שרת בפרסום</p>
              <p>{error}</p>
            </div>
          ) : /rate_limit|too many requests|חסם את ה-api|429/i.test(error) ? (
            <div className="space-y-1">
              <p className="font-bold">Buffer חסם פרסום ל־24 שעות</p>
              <p>{error}</p>
            </div>
          ) : (
            <p>{error}</p>
          )}
        </div>
      ) : null}

      {/* STEP 1 — Generate (was below; keep id for scroll) */}
      <section id="campaign-generate" className={cn("space-y-4", wizardStep !== 1 && "hidden")}>
        <h2 className="text-xl font-bold">1 · יצירת תוכן</h2>
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
                  <span>
                    {p.label}
                    {p.hint ? (
                      <span className="ms-1 text-xs font-normal text-[var(--muted-fg)]">({p.hint})</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
            {platforms.includes("facebook") && status.data && !status.data.facebook_configured ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Facebook דורש הגדרת FACEBOOK_PAGE_ID ו־FACEBOOK_PAGE_ACCESS_TOKEN בשרת — פרסום ישיר ל־Page, בלי מכסת
                Buffer.
              </p>
            ) : null}
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

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={!canCreate || !goal.trim() || platforms.length === 0 || generate.isPending}
              onClick={() => generate.mutate()}
              className="rounded-full bg-[#6F42F5] px-6 font-bold text-white hover:bg-[#5a32d4]"
            >
              {generate.isPending ? "יוצר קמפיין…" : "צור קמפיין"}
            </Button>
            {hasCampaign ? (
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setWizardStep(2)}>
                המשך למדיה →
              </Button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="font-bold text-emerald-900 dark:text-emerald-100">תזמון קמפיין אוטומטי</p>
            <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
              לחיצה אחת: יוצר תוכן (אם צריך), מריץ סימולציה ברקע ומתזמן — בלי לעבור על שלבי אישור ידניים.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                תאריך
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                שעה
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                אזור זמן
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                כמה פעמים לשלוח
                <input
                  type="number"
                  min={1}
                  max={48}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={scheduleRepeatCount}
                  onChange={(e) =>
                    setScheduleRepeatCount(Math.max(1, Math.min(48, Number(e.target.value) || 1)))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                כל כמה דקות
                <input
                  type="number"
                  min={5}
                  max={43200}
                  disabled={scheduleRepeatCount <= 1}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 disabled:opacity-50"
                  value={scheduleIntervalMinutes}
                  onChange={(e) =>
                    setScheduleIntervalMinutes(Math.max(5, Math.min(43200, Number(e.target.value) || 60)))
                  }
                />
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-400/40 bg-[var(--background)]/60 px-3 py-3 sm:self-end">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                  checked={sendFirstNow}
                  onChange={(e) => setSendFirstNow(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold">שלח עכשיו קמפיין ראשון</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted-fg)]">
                    השליחה הראשונה יוצאת מיד; השאר לפי התאריך שנבחר
                  </span>
                </span>
              </label>
            </div>
            <p className="mt-3 text-xs text-emerald-800/80 dark:text-emerald-200/80">
              {sendFirstNow
                ? scheduleRepeatCount > 1
                  ? `שליחה ראשונה עכשיו, ואז עוד ${scheduleRepeatCount - 1} ממועד שנבחר כל ${scheduleIntervalMinutes} דקות.`
                  : "שליחה מיידית אחת עכשיו."
                : scheduleRepeatCount > 1
                  ? `${scheduleRepeatCount} שליחות, כל ${scheduleIntervalMinutes} דקות ממועד ההתחלה.`
                  : "שליחה אחת במועד שנבחר."}
            </p>
            <Button
              type="button"
              disabled={
                !canManage ||
                !goal.trim() ||
                platforms.length === 0 ||
                (!sendFirstNow && !scheduleDate) ||
                (sendFirstNow && scheduleRepeatCount > 1 && !scheduleDate) ||
                generate.isPending ||
                autoRelease.isPending ||
                publish.isPending
              }
              onClick={() => autoRelease.mutate()}
              className="mt-3 rounded-full bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"
            >
              {autoRelease.isPending ? "מתזמן אוטומטית…" : "תזמן קמפיין אוטומטית"}
            </Button>
          </div>

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

      {/* STEP 2 — Per-platform media + captions */}
      <div className={cn(wizardStep !== 2 && "hidden")}>
      {hasCampaign && active ? (
        <>
          <section className="mb-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">2 · מדיה לפי רשת</h2>
                <p className="text-sm text-[var(--muted-fg)]">
                  טענו תמונה לכל הרשתות באותו שלב — פעם אחת לכולן, או בנפרד לכל רשת. אפשר גם ליצור PNG ב־AI לאינסטגרם.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setWizardStep(1)}>
                  ← חזרה
                </Button>
                <Button type="button" className="rounded-full bg-[#6F42F5] text-white" onClick={() => setWizardStep(3)}>
                  המשך לסימולציה →
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  disabled={!canManage || uploadPlatformMedia.isPending}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) {
                      uploadPlatformMedia.mutate({
                        platforms: ["linkedin", "instagram", "tiktok", "facebook"],
                        kind: "image",
                        file,
                      });
                    }
                  }}
                />
                <span className="rounded-full bg-[#1877F2] px-4 py-2 text-sm font-bold text-white">
                  טען תמונה לכל הרשתות
                </span>
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  {
                    id: "linkedin" as const,
                    title: "LinkedIn",
                    hint: "תמונה או סרטון לפוסט",
                  },
                  {
                    id: "instagram" as const,
                    title: "Instagram",
                    hint: "תמונה בפיד או Reel",
                  },
                  {
                    id: "tiktok" as const,
                    title: "TikTok",
                    hint: "סרטון (או תמונה כגיבוי)",
                  },
                  {
                    id: "facebook" as const,
                    title: "Facebook",
                    hint: "תמונה או סרטון ל־Page (Meta ישיר)",
                  },
                ] as const
              ).map((card) => {
                  const imageUrl = platformImageUrl(active, card.id);
                  const videoUrl = platformVideoUrl(active, card.id);
                  return (
                    <Card key={card.id} className="space-y-3 !rounded-2xl">
                      <div>
                        <p className="font-bold">{card.title}</p>
                        <p className="text-xs text-[var(--muted-fg)]">{card.hint}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                            className="sr-only"
                            disabled={!canManage || uploadPlatformMedia.isPending}
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              event.currentTarget.value = "";
                              if (file) {
                                uploadPlatformMedia.mutate({
                                  platform: card.id,
                                  kind: "image",
                                  file,
                                });
                              }
                            }}
                          />
                          <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-bold">
                            טען תמונה
                          </span>
                        </label>
                        <label className="inline-flex cursor-pointer items-center">
                          <input
                            type="file"
                            accept=".mp4,.mov,video/mp4,video/quicktime"
                            className="sr-only"
                            disabled={!canManage || uploadPlatformMedia.isPending}
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              event.currentTarget.value = "";
                              if (file) {
                                uploadPlatformMedia.mutate({
                                  platform: card.id,
                                  kind: "video",
                                  file,
                                });
                              }
                            }}
                          />
                          <span className="rounded-full bg-[#6F42F5] px-3 py-1.5 text-xs font-bold text-white">
                            טען סרטון
                          </span>
                        </label>
                      </div>
                      {card.id === "instagram" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canManage || !geminiEnabled || createAiImage.isPending}
                            onClick={() => createAiImage.mutate()}
                            className="rounded-full text-xs"
                          >
                            {createAiImage.isPending ? "AI…" : "צור תמונה ב־AI"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canManage || createIgImage.isPending}
                            onClick={() => createIgImage.mutate()}
                            className="rounded-full text-xs"
                          >
                            {createIgImage.isPending ? "PNG…" : "PNG מעוצב"}
                          </Button>
                          <div className="flex w-full flex-wrap gap-2 pt-1">
                            {(["image", "video"] as const).map((kind) => {
                              const selected = (active.instagram_media_type || "image") === kind;
                              const videoUnavailable = kind === "video" && !bestInstagramVideoUrl(active);
                              return (
                                <button
                                  key={kind}
                                  type="button"
                                  disabled={videoUnavailable}
                                  onClick={() => setActive({ ...active, instagram_media_type: kind })}
                                  className={cn(
                                    "rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-40",
                                    selected
                                      ? "bg-[#6F42F5] text-white"
                                      : "border border-[var(--border)] bg-[var(--background)]",
                                  )}
                                >
                                  {kind === "image" ? "תמונה בפיד" : "וידאו כ־Reel"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      {videoUrl && /\.(mp4|mov)(\?|$)/i.test(videoUrl) ? (
                        <video
                          key={videoUrl}
                          src={videoUrl}
                          controls
                          playsInline
                          className="max-h-48 w-full rounded-xl bg-black object-contain"
                        />
                      ) : isRasterCreative(imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={`${card.title} creative`}
                          className="max-h-48 w-full rounded-xl object-contain bg-[#0F172A]"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted-fg)]">
                          אין מדיה עדיין
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>

            {manualVideoName ? (
              <p className="text-xs text-[var(--muted-fg)]">קובץ אחרון שהועלה: {manualVideoName}</p>
            ) : null}
            {uploadPlatformMedia.isPending ? (
              <p className="text-sm font-medium text-[#6F42F5]">מעלה מדיה…</p>
            ) : null}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold">עריכת טקסטים</h2>
            <Card className="space-y-4 !rounded-2xl">
              <label className="block text-sm font-medium">
                כותרת קמפיין
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={active.title}
                  onChange={(e) => setActive({ ...active, title: e.target.value })}
                />
              </label>
              {(["linkedin", "instagram", "tiktok", "facebook"] as SocialPlatform[]).map((platform) => (
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
              ))}
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
                  {saveEdits.isPending ? "שומר…" : "שמור טקסטים"}
                </Button>
              ) : null}
            </Card>
          </section>

          <section className="space-y-3">
            <button
              type="button"
              className="text-sm font-bold text-[#6F42F5] underline-offset-2 hover:underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "הסתר כלים מתקדמים לטיקטוק ▲" : "הצג כלים מתקדמים לטיקטוק (תדמית / AI) ▼"}
            </button>
            {showAdvanced ? (
            <>
            <h3 className="text-lg font-bold">טיקטוק — מתקדם</h3>
            <Card className="space-y-4 !rounded-2xl">
          {bestTikTokVideoUrl(active) ? (
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
            <details className="rounded-xl border border-[var(--border)] p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-[var(--muted-fg)]">מתקדם: ספקי וידאו AI</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
            </details>
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
              disabled={!canManage || !hasCampaign || createIgImage.isPending || fixPngAndResim.isPending}
              onClick={() => fixPngAndResim.mutate()}
              className="rounded-full"
            >
              {createIgImage.isPending || fixPngAndResim.isPending ? "יוצר PNG…" : "צור / רענן תמונת PNG"}
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
                  active?.instagram_media_type === "video" &&
                  Boolean(bestInstagramVideoUrl(active))
                    ? "font-semibold text-emerald-700"
                    : isRasterCreative(active?.instagram_image_url || active?.media_url)
                    ? "font-semibold text-emerald-700"
                    : active?.instagram_image_url
                      ? "font-semibold text-amber-700"
                      : ""
                }
              >
                {active?.instagram_media_type === "video" &&
                Boolean(bestInstagramVideoUrl(active))
                  ? "Ready (video Reel)"
                  : isRasterCreative(active?.instagram_image_url || active?.media_url)
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
                  ? (active.tiktok_videos || []).some((v) => v.provider === "site_promo")
                    ? `Site promo video(s) · ${
                        (active.tiktok_videos || []).filter((v) => v.provider === "site_promo").length
                      }`
                    : isPlayableVideo(active.tiktok_video_url)
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
            </>
            ) : null}
      </section>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setWizardStep(1)}>
            ← חזרה
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#6F42F5] text-white"
            onClick={() => {
              setWizardStep(3);
              document.getElementById("campaign-simulation")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            המשך לסימולציה →
          </Button>
        </div>
        </>
      ) : (
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{needCampaignHint}</p>
      )}
      </div>

      <section id="campaign-simulation" className={cn("space-y-4", wizardStep !== 3 && "hidden")}>
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
                  {(active.tiktok_videos || []).some((v) => v.provider === "site_promo") ? (
                    <span className="mt-1 block font-semibold text-emerald-700 dark:text-emerald-300">
                      הסרטונים שסומנו: סרטוני תדמית מהאתר יופיעו בסימולציית TikTok למעלה.
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={!canManage || !hasCampaign || simulate.isPending}
                    onClick={() => {
                      simulate.mutate(undefined, {
                        onSuccess: () => {
                          setWizardStep(4);
                          document
                            .getElementById("campaign-release")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        },
                      });
                    }}
                    className="rounded-full bg-[#6F42F5] px-6 font-bold text-white hover:bg-[#5a32d4]"
                  >
                    {simulate.isPending && !simulated
                      ? "מריץ סימולציה…"
                      : "✓ אשר סימולציה והמשך לשליחה"}
                  </Button>
                  {!hasPng ? (
                    <Button
                      type="button"
                      disabled={!canManage || fixPngAndResim.isPending}
                      onClick={() => fixPngAndResim.mutate()}
                      className="rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                    >
                      {fixPngAndResim.isPending ? "מתקן…" : "צור PNG ותקן"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canManage || !hasCampaign || simulate.isPending}
                    onClick={() => {
                      simulate.mutate(undefined, {
                        onSuccess: () => {
                          document
                            .getElementById("campaign-simulation")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        },
                      });
                    }}
                    className="rounded-full"
                  >
                    {simulate.isPending ? "מרענן…" : "רענן סימולציה"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setWizardStep(4)}>
                    לשליחה →
                  </Button>
                </div>
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

      <section id="campaign-release" className={cn("space-y-4", wizardStep !== 4 && "hidden")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold">4 · אישור ושחרור</h2>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setWizardStep(3)}>
            ← חזרה לסימולציה
          </Button>
        </div>
        <Card className="space-y-4 !rounded-2xl border-red-200/80 dark:border-red-900/50">
          {!hasCampaign ? (
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{needCampaignHint}</p>
          ) : (
            <>
              {isPublished ? (
                <div
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "rounded-2xl border p-5 shadow-sm",
                    active?.last_error
                      ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                      : "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl font-black text-white",
                        active?.last_error ? "bg-amber-500" : "bg-emerald-600",
                      )}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <div className="space-y-2">
                      <div>
                        <p className="text-lg font-extrabold">
                          {active?.last_error
                            ? "הקמפיין נשלח חלקית"
                            : "הקמפיין נשלח בהצלחה והוא באוויר"}
                        </p>
                        <p className="text-sm opacity-80">
                          Buffer אישר את השליחה
                          {active?.published_at ? ` · ${formatDate(active.published_at)}` : ""}
                        </p>
                      </div>
                      {publishedPlatforms.length ? (
                        <div className="flex flex-wrap gap-2" aria-label="רשתות שבהן הקמפיין פורסם">
                          {publishedPlatforms.map((platform) => (
                            <span
                              key={platform}
                              className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold capitalize text-emerald-800 shadow-sm dark:bg-black/20 dark:text-emerald-200"
                            >
                              ✓ {platform}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {active?.last_error ? <p className="text-xs font-medium">{active.last_error}</p> : null}
                    </div>
                  </div>
                </div>
              ) : isScheduled ? (
                <div
                  role="status"
                  className="rounded-2xl border border-sky-300 bg-sky-50 p-5 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
                >
                  <p className="text-lg font-extrabold">הקמפיין מתוזמן וממתין לפרסום</p>
                  <p className="mt-1 text-sm">
                    מועד השליחה: {formatDate(active?.scheduled_at)}
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  {simulated
                    ? "סימולציה אושרה — מוכנים לשליחה."
                    : "מומלץ לאשר סימולציה בשלב 3 לפני שליחה (או שהשליחה תריץ אותה אוטומטית)."}
                </p>
                {!hasPng ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">חסרה תמונת PNG</p>
                    <Button
                      type="button"
                      disabled={!canManage || fixPngAndResim.isPending}
                      onClick={() => fixPngAndResim.mutate()}
                      className="rounded-full bg-[#6F42F5] font-bold text-white"
                    >
                      {fixPngAndResim.isPending ? "מתקן…" : "צור תמונת PNG ותקן"}
                    </Button>
                  </div>
                ) : null}
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
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canManage || simulate.isPending || publishing}
                    onClick={() => simulate.mutate()}
                    className="rounded-full"
                  >
                    רענן סימולציה
                  </Button>
                  <p className="w-full text-xs text-amber-900 dark:text-amber-100">
                    או לחצו ישירות על &quot;שלח קמפיין לרשת&quot; — הסימולציה תרוץ אוטומטית ואז תישלח.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    הסימולציה עברה — אפשר לשלוח את הקמפיין לרשת.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canManage || simulate.isPending || publishing}
                    onClick={() => simulate.mutate()}
                    className="rounded-full"
                  >
                    {simulate.isPending ? "מרענן…" : "רענן סימולציה"}
                  </Button>
                </div>
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
                תאריך
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                שעה
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                אזור זמן
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
              <label className="text-sm font-medium">
                כמה פעמים לשלוח
                <input
                  type="number"
                  min={1}
                  max={48}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={scheduleRepeatCount}
                  onChange={(e) =>
                    setScheduleRepeatCount(Math.max(1, Math.min(48, Number(e.target.value) || 1)))
                  }
                />
              </label>
              <label className="text-sm font-medium">
                כל כמה דקות
                <input
                  type="number"
                  min={5}
                  max={43200}
                  disabled={scheduleRepeatCount <= 1}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 disabled:opacity-50"
                  value={scheduleIntervalMinutes}
                  onChange={(e) =>
                    setScheduleIntervalMinutes(Math.max(5, Math.min(43200, Number(e.target.value) || 60)))
                  }
                />
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-3 md:self-end">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#6F42F5]"
                  checked={sendFirstNow}
                  onChange={(e) => setSendFirstNow(e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold">שלח עכשיו קמפיין ראשון</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted-fg)]">
                    השליחה הראשונה יוצאת מיד; השאר לפי התאריך שנבחר
                  </span>
                </span>
              </label>
              <p className="text-xs text-[var(--muted-fg)] md:col-span-3">
                {sendFirstNow
                  ? scheduleRepeatCount > 1
                    ? `שליחה ראשונה עכשיו, ואז עוד ${scheduleRepeatCount - 1} ל־Buffer ממועד שנבחר כל ${scheduleIntervalMinutes} דקות.`
                    : "שליחה מיידית אחת עכשיו."
                  : scheduleRepeatCount > 1
                    ? `${scheduleRepeatCount} שליחות ל־Buffer, כל ${scheduleIntervalMinutes} דקות.`
                    : "שליחה אחת במועד שנבחר."}
              </p>
              <Button
                type="button"
                disabled={
                  !canManage ||
                  !hasCampaign ||
                  (!sendFirstNow && !scheduleDate) ||
                  (sendFirstNow && scheduleRepeatCount > 1 && !scheduleDate) ||
                  publishing ||
                  simulate.isPending
                }
                onClick={() => publish.mutate()}
                className="md:col-span-3 rounded-full bg-red-600 font-bold text-white hover:bg-red-700 disabled:bg-red-600/40"
              >
                אישור תזמון ושחרור
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

      {status.data?.error && /rate_limit|too many requests|חסם את ה-api|429/i.test(status.data.error) ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-bold">Buffer API rate limit פעיל</p>
          <p className="mt-1 text-xs">{status.data.error}</p>
        </div>
      ) : null}

      {/* Republish shuffle from published campaigns */}
      {canManage ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">פרסום חוזר</h2>
            <p className="mt-1 text-sm text-[var(--muted-fg)]">
              בחרו קמפיינים שפורסמו, בחרו איך לשלוח, ולחצו על הכפתור. שלושה שלבים פשוטים.
            </p>
          </div>

          {republishNotice ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
              <p className="font-semibold">פרסום חוזר בוצע</p>
              <p className="mt-1 text-xs opacity-90">{republishNotice}</p>
            </div>
          ) : null}

          {republishCron.data?.enabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-emerald-950 dark:text-emerald-100">חזרה אוטומטית פעילה</p>
                <p className="mt-0.5 text-xs text-emerald-900/80 dark:text-emerald-100/75">
                  כל {republishCron.data.interval_hours} שע׳ · ריצה הבאה:{" "}
                  {republishCron.data.next_run_at
                    ? formatDate(republishCron.data.next_run_at)
                    : "בקרוב"}
                </p>
                <p className="mt-0.5 text-xs text-emerald-900/80 dark:text-emerald-100/75">
                  שליחה אחרונה במערכת:{" "}
                  {republishCron.data.last_run_at
                    ? formatDate(republishCron.data.last_run_at)
                    : "עדיין לא נרשמה"}
                  {republishCron.data.last_campaign_ids?.length
                    ? ` · ${republishCron.data.last_campaign_ids.length} קמפיין`
                    : ""}
                  {republishCron.data.last_error ? ` · שגיאה: ${republishCron.data.last_error}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={setRepublishCron.isPending}
                onClick={() => setRepublishCron.mutate(false)}
                className="shrink-0 rounded-full border-red-500/50 text-red-700 dark:text-red-300"
              >
                {setRepublishCron.isPending ? "עוצר…" : "עצור חזרה"}
              </Button>
            </div>
          ) : null}

          <Card className="space-y-6 !rounded-2xl !p-5 sm:!p-6">
            {/* Step 1 — campaigns */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  <span className="me-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6F42F5] text-xs font-bold text-white">
                    1
                  </span>
                  בחירת קמפיינים
                </p>
                {publishedForRepublish.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#6F42F5] hover:underline"
                      onClick={() => setRepublishIds(publishedForRepublish.map((c) => c.id))}
                    >
                      בחר הכל
                    </button>
                    <span className="text-[var(--muted-fg)]">·</span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--muted-fg)] hover:underline"
                      onClick={() => setRepublishIds([])}
                    >
                      נקה
                    </button>
                    <span className="rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium tabular-nums">
                      {republishIds.length}/{publishedForRepublish.length}
                    </span>
                  </div>
                ) : null}
              </div>

              {publishedForRepublish.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted-fg)]">
                  אין עדיין קמפיינים שפורסמו או תוזמנו לבחירה.
                </p>
              ) : (
                <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-2">
                  {publishedForRepublish.map((row) => {
                    const checked = republishIds.includes(row.id);
                    return (
                      <label
                        key={row.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition",
                          checked ? "bg-[#6F42F5]/10 ring-1 ring-[#6F42F5]/25" : "hover:bg-[var(--background)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[#6F42F5]"
                          checked={checked}
                          onChange={() => {
                            setRepublishIds((prev) =>
                              checked ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                            );
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{row.title || "Untitled"}</span>
                          <span className="block text-xs text-[var(--muted-fg)]">
                            {(row.platforms || []).join(", ")}
                            {row.published_at ? ` · ${formatDate(row.published_at)}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2 — strategy */}
            <div className="space-y-3 border-t border-[var(--border)] pt-5">
              <p className="text-sm font-semibold">
                <span className="me-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6F42F5] text-xs font-bold text-white">
                  2
                </span>
                כמה לשלוח
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      id: "random_one" as const,
                      title: "אחד באקראי",
                      desc: "בוחרים קמפיין אחד מהרשימה ושולחים אותו",
                    },
                    {
                      id: "shuffle_all" as const,
                      title: "כולם בסדר אקראי",
                      desc: "מערבבים את כל הנבחרים ושולחים/מתזמנים לפי הסדר",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRepublishStrategy(opt.id)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-start transition",
                      republishStrategy === opt.id
                        ? "border-[#6F42F5] bg-[#6F42F5]/10 ring-1 ring-[#6F42F5]/30"
                        : "border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)]/40",
                    )}
                  >
                    <span className="block text-sm font-semibold">{opt.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted-fg)]">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 — when */}
            <div className="space-y-3 border-t border-[var(--border)] pt-5">
              <p className="text-sm font-semibold">
                <span className="me-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6F42F5] text-xs font-bold text-white">
                  3
                </span>
                מתי לשלוח
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    {
                      id: "now" as const,
                      title: "עכשיו",
                      desc: "שליחה חד־פעמית מיידית",
                    },
                    {
                      id: "schedule" as const,
                      title: "תזמון",
                      desc: "תאריך ושעה מוגדרים מראש",
                    },
                    {
                      id: "now_hourly" as const,
                      title: "חזרה אוטומטית",
                      desc: "שולחים מיד, ואז חוזרים כל שעה",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setRepublishMode(opt.id);
                      if (opt.id === "now_hourly" && cronIntervalHours < 1) {
                        setCronIntervalHours(1);
                      }
                    }}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-start transition",
                      republishMode === opt.id
                        ? "border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-600/30"
                        : "border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)]/40",
                    )}
                  >
                    <span className="block text-sm font-semibold">{opt.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted-fg)]">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {republishMode === "schedule" ? (
                <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 sm:grid-cols-3">
                  <label className="block text-sm font-medium">
                    תאריך
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    שעה
                    <input
                      type="time"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </label>
                  {republishStrategy === "shuffle_all" ? (
                    <label className="block text-sm font-medium">
                      מרווח בין קמפיינים (דקות)
                      <input
                        type="number"
                        min={5}
                        max={43200}
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                        value={republishIntervalMinutes}
                        onChange={(e) =>
                          setRepublishIntervalMinutes(
                            Math.max(5, Math.min(43200, Number(e.target.value) || 60)),
                          )
                        }
                      />
                    </label>
                  ) : (
                    <label className="block text-sm font-medium">
                      אזור זמן
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                      />
                    </label>
                  )}
                </div>
              ) : null}

              {republishMode === "now_hourly" ? (
                <div className="flex flex-wrap items-end gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <label className="block text-sm font-medium">
                    חזרה כל כמה שעות
                    <input
                      type="number"
                      min={1}
                      max={720}
                      className="mt-1 w-28 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                      value={cronIntervalHours}
                      onChange={(e) =>
                        setCronIntervalHours(Math.max(1, Math.min(720, Number(e.target.value) || 1)))
                      }
                    />
                  </label>
                  <p className="max-w-md pb-2 text-xs text-[var(--muted-fg)]">
                    נשלח עכשיו לפי האסטרטגיה, ואז ממשיכים לבחור באקראי מהרשימה כל {cronIntervalHours} שע׳.
                    דורש worker פעיל.
                  </p>
                </div>
              ) : null}

              {republishMode === "now" ? (
                <p className="text-xs text-[var(--muted-fg)]">
                  {republishStrategy === "random_one"
                    ? "שולחים עכשיו קמפיין אחד באקראי מהבחירה."
                    : "שולחים עכשיו את כל הנבחרים בסדר אקראי (שימו לב להגבלות קצב של Buffer)."}
                </p>
              ) : null}
            </div>

            {/* CTA */}
            <div className="border-t border-[var(--border)] pt-5">
              <Button
                type="button"
                disabled={
                  !canManage ||
                  republishIds.length === 0 ||
                  republishBatch.isPending ||
                  (republishMode === "schedule" && !scheduleDate)
                }
                onClick={() => republishBatch.mutate()}
                className="w-full rounded-full bg-[#6F42F5] px-6 py-3 text-base font-bold text-white hover:bg-[#5a32d4] sm:w-auto"
              >
                {republishBatch.isPending
                  ? "שולח…"
                  : republishMode === "now_hourly"
                    ? `שלח עכשיו והפעל חזרה כל ${cronIntervalHours} שע׳`
                    : republishMode === "schedule"
                      ? republishStrategy === "random_one"
                        ? "תזמן אחד באקראי"
                        : "תזמן את כולם"
                      : republishStrategy === "random_one"
                        ? "שלח אחד באקראי"
                        : "שלח את כולם עכשיו"}
              </Button>
              {republishIds.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--muted-fg)]">בחרו לפחות קמפיין אחד בשלב 1 כדי להמשיך.</p>
              ) : null}
            </div>
          </Card>
        </section>
      ) : null}

      {/* History */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">היסטוריית קמפיינים</h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">
            עמודת «פורסם לאחרונה» מתעדכנת בכל שליחה/פרסום חוזר — גם אם זה אותו קמפיין.
          </p>
        </div>
        <Card className="overflow-x-auto !rounded-2xl !p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3">נוצר</th>
                <th className="px-4 py-3">קמפיין</th>
                <th className="px-4 py-3">רשתות</th>
                <th className="px-4 py-3">סטטוס</th>
                <th className="px-4 py-3">פורסם לאחרונה</th>
                <th className="px-4 py-3">מתוזמן</th>
                <th className="px-4 py-3">פעולות</th>
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
              {(history.data?.results || []).map((row) => {
                const republished =
                  Array.isArray(row.publish_log) &&
                  row.publish_log.some((e) => /republish/i.test(e.detail || "") || /republish/i.test(e.step || ""));
                return (
                <tr key={row.id} className="border-b border-[var(--border)] align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{row.title || "Untitled"}</td>
                  <td className="px-4 py-3">{(row.platforms || []).join(", ")}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-bold uppercase">
                        {row.status}
                      </span>
                      {republished ? (
                        <span className="ms-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                          republished
                        </span>
                      ) : null}
                      {row.last_error ? (
                        <p className="max-w-[220px] text-[11px] leading-snug text-amber-600 dark:text-amber-300">
                          {row.last_error}
                        </p>
                      ) : null}
                    </div>
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
                          setWizardStep(2);
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
              );
              })}
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
