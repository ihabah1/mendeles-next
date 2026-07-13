import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/auth";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type SocialPlatform = "linkedin" | "instagram" | "tiktok";

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
};

export type PublishInput = {
  campaign_id: string;
  mode: "now" | "schedule";
  scheduled_at?: string;
  timezone?: string;
};

export const socialApi = {
  status: () =>
    apiFetch<{
      buffer_configured: boolean;
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
