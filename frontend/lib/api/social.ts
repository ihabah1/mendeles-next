import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type SocialPlatform = "linkedin" | "instagram" | "tiktok";

export type SimulationLogEntry = {
  step: string;
  ok: boolean;
  detail?: string;
};

export type SocialCampaign = {
  id: string;
  title: string;
  goal: string;
  campaign_type: string;
  tone: string;
  target_audience: string;
  website_url: string;
  platforms: SocialPlatform[];
  captions: Partial<Record<SocialPlatform, string>>;
  hashtags: Partial<Record<SocialPlatform, string[]>>;
  cta: string;
  main_idea: string;
  media_type: "image" | "video";
  media_prompt: string;
  video_prompt: string;
  media_url: string;
  linkedin_image_url?: string;
  linkedin_video_url?: string;
  instagram_image_url: string;
  instagram_video_url?: string;
  instagram_media_type: "image" | "video";
  campaign_video_url: string;
  tiktok_video_url: string;
  tiktok_videos?: Array<{
    url: string;
    provider?: string;
    promo_id?: string;
    title?: string;
    variation?: number;
    credits_used?: number;
  }>;
  creative_log?: Array<{ at: string; level: string; message: string }>;
  creative_progress?: number;
  tiktok_generating?: boolean;
  simulated_at: string | null;
  simulation_log: SimulationLogEntry[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  timezone: string;
  buffer_update_ids: Record<string, string>;
  last_error: string;
  publish_log: Array<{ step: string; detail: string; ok: boolean; at: string }>;
  created_at: string | null;
};

export type GenerateCampaignInput = {
  goal: string;
  campaign_type: string;
  tone: string;
  target_audience: string;
  website_url: string;
  media_type: "image" | "video";
  platforms: SocialPlatform[];
  tiktok_video_count?: number;
};

export type PublishInput = {
  campaign_id: string;
  mode: "now" | "schedule";
  scheduled_at?: string;
  timezone?: string;
  auto_release?: boolean;
};

export const socialApi = {
  status: () =>
    apiFetch<{
      buffer_configured: boolean;
      gemini_enabled: boolean;
      channels?: Array<{
        id: string;
        service: string;
        name?: string;
        display_name?: string;
        label?: string;
        type?: string;
        formatted_username: string;
        is_disconnected?: boolean;
        is_locked?: boolean;
      }>;
      profiles: Array<{ id: string; service: string; formatted_username: string }>;
      error: string;
    }>("/api/v1/social/status/", { headers: authHeaders() }),
  list: () =>
    apiFetch<{ results: SocialCampaign[] }>("/api/v1/social/campaigns/", { headers: authHeaders() }),
  get: (id: string) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/`, { headers: authHeaders() }),
  generate: (body: GenerateCampaignInput) =>
    apiFetch<SocialCampaign>("/api/v1/social/campaigns/", {
      method: "POST",
      headers: authHeaders(),
      json: body,
    }),
  update: (id: string, body: Partial<{
    title: string;
    captions: SocialCampaign["captions"];
    hashtags: SocialCampaign["hashtags"];
    cta: string;
    media_prompt: string;
    video_prompt: string;
    media_url: string;
    instagram_media_type: "image" | "video";
    timezone: string;
  }>) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/`, {
      method: "PATCH",
      headers: authHeaders(),
      json: body,
    }),
  remove: (id: string) =>
    apiFetch<void>(`/api/v1/social/campaigns/${id}/`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  simulate: (id: string) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/simulate/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  createInstagramImage: (id: string) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/instagram-image/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  generateAiCampaignImage: (id: string) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/instagram-image/`, {
      method: "POST",
      headers: authHeaders(),
      json: { mode: "ai" },
    }),
  uploadInstagramPng: (id: string, data_url: string) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/instagram-image/`, {
      method: "POST",
      headers: authHeaders(),
      json: { data_url },
    }),
  uploadTikTokVideo: (id: string, data_url = "") =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/tiktok-video/`, {
      method: "POST",
      headers: authHeaders(),
      json: data_url ? { data_url } : {},
    }),
  uploadCampaignVideo: (id: string, data_url: string, use_for_instagram = true) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/campaign-video/`, {
      method: "POST",
      headers: authHeaders(),
      json: { data_url, mode: "manual", use_for_instagram },
    }),
  uploadPlatformMedia: (
    id: string,
    body: { platform: SocialPlatform; kind: "image" | "video"; data_url: string },
  ) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/platform-media/`, {
      method: "POST",
      headers: authHeaders(),
      json: body,
    }),
  attachSitePromoVideos: (id: string, promo_ids: string[]) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/tiktok-video/`, {
      method: "POST",
      headers: authHeaders(),
      json: { mode: "promo", promo_ids },
    }),
  generateAiTikTokVideos: (id: string, count = 3) =>
    apiFetch<SocialCampaign & { ai_generation?: Record<string, unknown> }>(
      `/api/v1/social/campaigns/${id}/tiktok-video/`,
      {
        method: "POST",
        headers: authHeaders(),
        json: { mode: "ai", count, async: false },
      },
    ),
  videoProviders: () =>
    apiFetch<{
      providers: Array<{
        provider: string;
        configured: boolean;
        credits_remaining: number | null;
        available: boolean;
        message: string;
        cost_per_video: number;
      }>;
      failover_order: string[];
    }>("/api/v1/social/video-providers/", { headers: authHeaders() }),
  publish: (body: PublishInput) =>
    apiFetch<SocialCampaign>("/api/v1/social/publish/", {
      method: "POST",
      headers: authHeaders(),
      json: body,
    }),
  republish: (id: string) =>
    apiFetch<SocialCampaign>(`/api/v1/social/campaigns/${id}/republish/`, {
      method: "POST",
      headers: authHeaders(),
    }),
};
