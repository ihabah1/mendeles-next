"use client";

import { useMemo, useState } from "react";
import { InstagramPreview, LinkedInPreview, TikTokPreview } from "@/components/social/social-previews";
import type { SocialCampaign, SocialPlatform } from "@/lib/api/social";
import { PROMO_VIDEOS } from "@/lib/marketing/promo-videos";
import { cn } from "@/lib/utils";

type TabId = "all" | SocialPlatform;

const TABS: { id: TabId; label: string; he: string }[] = [
  { id: "all", label: "All", he: "הכל" },
  { id: "linkedin", label: "LinkedIn", he: "לינקדאין" },
  { id: "instagram", label: "Instagram", he: "אינסטגרם" },
  { id: "tiktok", label: "TikTok", he: "טיקטוק" },
];

type Props = {
  campaign: SocialCampaign;
  /** Platforms selected for this campaign (falls back to campaign.platforms). */
  platforms?: SocialPlatform[];
  className?: string;
};

function sitePromoEntries(campaign: SocialCampaign) {
  return (campaign.tiktok_videos || []).filter((v) => v?.provider === "site_promo" && v.url);
}

export function CampaignNetworkSimulator({ campaign, platforms, className }: Props) {
  const selected = useMemo(() => {
    const list = (platforms?.length ? platforms : campaign.platforms) || [];
    const unique = (["linkedin", "instagram", "tiktok"] as SocialPlatform[]).filter((p) => list.includes(p));
    return unique.length ? unique : (["linkedin", "instagram", "tiktok"] as SocialPlatform[]);
  }, [campaign.platforms, platforms]);

  const promos = useMemo(() => sitePromoEntries(campaign), [campaign.tiktok_videos]);
  const usingSitePromo = promos.length > 0;

  const [tab, setTab] = useState<TabId>("all");

  const showLinkedIn = selected.includes("linkedin") && (tab === "all" || tab === "linkedin");
  const showInstagram = selected.includes("instagram") && (tab === "all" || tab === "instagram");
  const showTikTok = selected.includes("tiktok") && (tab === "all" || tab === "tiktok");

  const visibleTabs = TABS.filter((t) => t.id === "all" || selected.includes(t.id as SocialPlatform));

  return (
    <div className={cn("space-y-4", className)}>
      {usingSitePromo ? (
        <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="font-bold">סימולציית TikTok משתמשת בסרטוני תדמית מהאתר</p>
          <ul className="mt-2 space-y-1 text-xs">
            {promos.map((v, i) => {
              const catalog = PROMO_VIDEOS.find((p) => p.id === v.promo_id);
              const label = v.title || catalog?.title || v.promo_id || `Promo ${i + 1}`;
              return (
                <li key={`${v.url}-${i}`} className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 font-semibold">סרטון תדמית</span>
                  <span>{label}</span>
                  <a href={v.url} target="_blank" rel="noreferrer" className="underline opacity-80">
                    פתח MP4
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
              tab === t.id
                ? "border-[#6F42F5] bg-[#6F42F5] text-white"
                : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-fg)] hover:border-[#6F42F5]/50",
            )}
          >
            <span className="me-1">{t.he}</span>
            <span className="opacity-70">· {t.label}</span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "grid gap-6",
          tab === "all" ? "lg:grid-cols-3" : "mx-auto max-w-xl lg:grid-cols-1",
        )}
      >
        {showLinkedIn ? (
          <figure className="space-y-2">
            <figcaption className="text-center text-xs font-bold uppercase tracking-wide text-[#0A66C2]">
              LinkedIn · {campaign.linkedin_video_url ? "כך יופיע עם וידאו" : "כך יופיע בפיד"}
            </figcaption>
            <LinkedInPreview campaign={campaign} />
          </figure>
        ) : null}
        {showInstagram ? (
          <figure className="space-y-2">
            <figcaption className="text-center text-xs font-bold uppercase tracking-wide text-pink-600">
              Instagram · {campaign.instagram_media_type === "video" ? "כך יופיע כ־Reel" : "כך יופיע בפרופיל"}
            </figcaption>
            <InstagramPreview campaign={campaign} />
          </figure>
        ) : null}
        {showTikTok ? (
          <figure className="space-y-2">
            <figcaption className="text-center text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              TikTok · כך יופיע בפיד
              {usingSitePromo ? " · סרטון תדמית" : ""}
            </figcaption>
            <TikTokPreview campaign={campaign} />
            {usingSitePromo && promos.length > 1 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {promos.slice(0, 3).map((v, i) => (
                  <video
                    key={`${v.url}-thumb-${i}`}
                    src={v.url}
                    className="aspect-[9/16] max-h-40 w-full rounded-xl border border-[var(--border)] object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    controls
                  />
                ))}
              </div>
            ) : null}
          </figure>
        ) : null}
      </div>

      <p className="text-center text-xs text-[var(--muted-fg)]">
        תצוגה מקדימה לפי הכותרות, התמונה/הווידאו והקריאייטיב הנוכחיים — לפני שליחה לרשת.
      </p>
    </div>
  );
}
