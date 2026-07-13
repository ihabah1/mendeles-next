"use client";

import type { SocialCampaign, SocialPlatform } from "@/lib/api/social";

type Props = {
  campaign: SocialCampaign;
};

function hashtagsLine(campaign: SocialCampaign, platform: SocialPlatform) {
  const tags = campaign.hashtags?.[platform] || [];
  return tags.join(" ");
}

export function LinkedInPreview({ campaign }: Props) {
  const text = campaign.captions?.linkedin || "";
  const tags = hashtagsLine(campaign, "linkedin");
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm dark:bg-zinc-900">
      <div className="border-b border-[var(--border)] bg-[#0A66C2]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0A66C2]">
        LinkedIn Preview
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A66C2] text-sm font-bold text-white">M</div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Mendeles</p>
            <p className="text-xs text-slate-500">AI Lead Generation Platform</p>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {text}
          {tags ? `\n\n${tags}` : ""}
          {campaign.cta ? `\n\n${campaign.cta}` : ""}
        </p>
        {campaign.instagram_image_url || campaign.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.instagram_image_url || campaign.media_url}
            alt=""
            className="h-48 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400 dark:bg-zinc-800">
            Image placeholder
          </div>
        )}
        <div className="flex justify-between border-t border-[var(--border)] pt-3 text-xs font-semibold text-slate-500">
          <span>Like</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      </div>
    </div>
  );
}

export function InstagramPreview({ campaign }: Props) {
  const text = campaign.captions?.instagram || "";
  const tags = hashtagsLine(campaign, "instagram");
  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] border-[8px] border-zinc-900 bg-white shadow-xl dark:border-zinc-700">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold">M</div>
        </div>
        <p className="text-xs font-bold">mendeles</p>
      </div>
      {campaign.instagram_image_url || campaign.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.instagram_image_url || campaign.media_url}
          alt=""
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-slate-100 text-xs text-slate-400">Image</div>
      )}
      <div className="space-y-2 p-3">
        <div className="flex gap-3 text-xs font-semibold">
          <span>♥ Likes</span>
          <span>💬 Comments</span>
        </div>
        <p className="whitespace-pre-wrap text-xs leading-relaxed">
          <span className="font-bold">mendeles </span>
          {text}
        </p>
        {tags ? <p className="text-xs text-sky-700">{tags}</p> : null}
        {campaign.cta ? <p className="text-xs font-semibold text-slate-700">{campaign.cta}</p> : null}
      </div>
    </div>
  );
}

export function TikTokPreview({ campaign }: Props) {
  const text = campaign.captions?.tiktok || "";
  const tags = hashtagsLine(campaign, "tiktok");
  const media = campaign.tiktok_video_url || campaign.instagram_image_url || campaign.media_url;
  const isVideo = Boolean(media && /\.(webm|mp4|mov)(\?|$)/i.test(media));
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[32px] border-[8px] border-zinc-900 bg-zinc-950 shadow-xl">
      <div className="relative aspect-[9/16] bg-gradient-to-b from-zinc-800 to-zinc-950">
        {media ? (
          isVideo ? (
            <video
              src={media}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          )
        ) : null}
        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-xs font-bold text-white">@mendeles</p>
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/90">
            {text}
            {tags ? `\n${tags}` : ""}
          </p>
          <p className="text-[10px] text-white/70">♪ Original sound — Mendeles</p>
        </div>
        <div className="absolute bottom-20 end-3 flex flex-col items-center gap-4 text-white">
          <span className="text-[10px]">♥</span>
          <span className="text-[10px]">💬</span>
          <span className="text-[10px]">↗</span>
        </div>
      </div>
    </div>
  );
}
