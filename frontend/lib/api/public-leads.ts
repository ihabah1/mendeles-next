import { apiFetch } from "./client";

export type LeadCaptureFields = {
  name: string;
  phone?: string;
  email: string;
  message?: string;
};

export type LeadCaptureUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

export type LeadCapturePayload = {
  formId: string;
  pageId?: string;
  pageUrl?: string;
  referrer?: string;
  fields: LeadCaptureFields;
  utm?: LeadCaptureUtm;
  honeypot?: string;
};

export function readUtmFromLocation(search: string): LeadCaptureUtm {
  const params = new URLSearchParams(search);
  return {
    source: params.get("utm_source") || undefined,
    medium: params.get("utm_medium") || undefined,
    campaign: params.get("utm_campaign") || undefined,
    content: params.get("utm_content") || undefined,
    term: params.get("utm_term") || undefined,
  };
}

export const publicLeadsApi = {
  submit: (payload: LeadCapturePayload) =>
    apiFetch<{ ok: boolean }>("/api/v1/leads/public/submit/", {
      method: "POST",
      json: payload,
    }),
};
