import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type SocialPlatform = "linkedin" | "instagram" | "tiktok" | "facebook";

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
  facebook_image_url?: string;
  facebook_video_url?: string;
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
  updated_at?: string | null;
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
  send_first_now?: boolean;
  interval_minutes?: number;
  repeat_count?: number;
};

export const socialApi = {
  status: () =>
    apiFetch<{
      buffer_configured: boolean;
      facebook_configured?: boolean;
      facebook_page?: string;
      facebook_can_publish?: boolean | null;
      facebook_missing_permissions?: string[];
      facebook_token_error?: string;
      facebook_token_kind?: string;
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
        provider?: string;
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
    platforms: SocialPlatform[];
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
  republishBatch: (body: {
    campaign_ids: string[];
    strategy: "random_one" | "shuffle_all";
    mode: "now" | "schedule";
    scheduled_at?: string;
    interval_minutes?: number;
    timezone?: string;
  }) =>
    apiFetch<{
      strategy: string;
      order: string[];
      count?: number;
      results: SocialCampaign[];
      error?: string;
    }>("/api/v1/social/republish-batch/", {
      method: "POST",
      headers: authHeaders(),
      json: body,
    }),

  republishCronStatus: () =>
    apiFetch<{
      enabled: boolean;
      job_id: string | null;
      status: string | null;
      interval_hours: number;
      campaign_ids: string[];
      next_run_at: string | null;
      last_job_id: string | null;
      last_status: string | null;
      last_error: string;
      last_run_at?: string | null;
      last_campaign_ids?: string[];
      last_result?: Record<string, unknown>;
      error?: string;
    }>("/api/v1/social/republish-cron/", { headers: authHeaders() }),

  setRepublishCron: (body: {
    enabled: boolean;
    interval_hours?: number;
    campaign_ids?: string[];
    last_order?: string[];
    last_error?: string;
  }) =>
    apiFetch<{
      enabled: boolean;
      job_id: string | null;
      status: string | null;
      interval_hours: number;
      campaign_ids: string[];
      next_run_at: string | null;
      last_job_id: string | null;
      last_status: string | null;
      last_error: string;
      last_run_at?: string | null;
      last_campaign_ids?: string[];
      last_result?: Record<string, unknown>;
      error?: string;
    }>("/api/v1/social/republish-cron/", {
      method: "POST",
      headers: authHeaders(),
      json: body,
    }),

  campaignReport: (refresh = false) =>
    apiFetch<{
      generated_at: string;
      ga4_connected: boolean;
      ga4_connection_state?: string;
      ga4_error: string;
      ga4_note: string;
      ga4_property_id?: string;
      ga4_property_label?: string;
      rows: Array<{
        campaign_id: string;
        campaign_name: string;
        status: string;
        platforms: string[];
        published_at: string | null;
        scheduled_at: string | null;
        event_at: string | null;
        tracking_code: string;
        tracked_url: string;
        sessions: number | null;
        pageviews: number | null;
        users: number | null;
        visits_available: boolean;
      }>;
      totals: { campaigns: number; sessions: number; pageviews: number };
    }>(`/api/v1/social/campaign-report/${refresh ? "?refresh=1" : ""}`, {
      headers: authHeaders(),
    }),

  campaignReportExportUrl: () => "/api/v1/social/campaign-report/export.csv",
};
