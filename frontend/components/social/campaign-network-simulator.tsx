"use client";

import { useMemo, useState } from "react";
import { InstagramPreview, LinkedInPreview, TikTokPreview } from "@/components/social/social-previews";
import type { SocialCampaign, SocialPlatform } from "@/lib/api/social";
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

export function CampaignNetworkSimulator({ campaign, platforms, className }: Props) {
  const selected = useMemo(() => {
    const list = (platforms?.length ? platforms : campaign.platforms) || [];
    const unique = (["linkedin", "instagram", "tiktok"] as SocialPlatform[]).filter((p) => list.includes(p));
    return unique.length ? unique : (["linkedin", "instagram", "tiktok"] as SocialPlatform[]);
  }, [campaign.platforms, platforms]);

  const [tab, setTab] = useState<TabId>("all");

  const showLinkedIn = selected.includes("linkedin") && (tab === "all" || tab === "linkedin");
  const showInstagram = selected.includes("instagram") && (tab === "all" || tab === "instagram");
  const showTikTok = selected.includes("tiktok") && (tab === "all" || tab === "tiktok");

  const visibleTabs = TABS.filter((t) => t.id === "all" || selected.includes(t.id as SocialPlatform));

  return (
    <div className={cn("space-y-4", className)}>
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
              LinkedIn · כך יופיע בפיד
            </figcaption>
            <LinkedInPreview campaign={campaign} />
          </figure>
        ) : null}
        {showInstagram ? (
          <figure className="space-y-2">
            <figcaption className="text-center text-xs font-bold uppercase tracking-wide text-pink-600">
              Instagram · כך יופיע בפרופיל
            </figcaption>
            <InstagramPreview campaign={campaign} />
          </figure>
        ) : null}
        {showTikTok ? (
          <figure className="space-y-2">
            <figcaption className="text-center text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              TikTok · כך יופיע בפיד
            </figcaption>
            <TikTokPreview campaign={campaign} />
          </figure>
        ) : null}
      </div>

      <p className="text-center text-xs text-[var(--muted-fg)]">
        תצוגה מקדימה לפי הכותרות, התמונה/הווידאו והקריאייטיב הנוכחיים — לפני שליחה לרשת.
      </p>
    </div>
  );
}
