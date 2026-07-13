import { apiFetch } from "@/lib/api/client";
import type { ContactSiteConfig } from "@/lib/contact/site-config";
import { getContactSiteConfig } from "@/lib/contact/site-config";

export type PublicFeatures = {
  contact_widget_home: boolean;
  whatsapp_balloon: boolean;
  contact: ContactSiteConfig;
};

const DEFAULT_CONTACT: ContactSiteConfig = {
  phone: "",
  email: "mendelessupport@gmail.com",
  whatsappNumber: "972537985362",
  whatsappMessage: "שלום, אשמח לעזרה מבוט Mendeles",
};

/** Fail closed: if flags cannot be loaded, do not show marketing balloons. */
const FALLBACK_FEATURES: PublicFeatures = {
  contact_widget_home: false,
  whatsapp_balloon: false,
  contact: DEFAULT_CONTACT,
};

let cached: PublicFeatures | null = null;
let cacheTs = 0;
const CACHE_MS = 30_000;

function mergeContact(remote: Partial<ContactSiteConfig> | undefined): ContactSiteConfig {
  const local = getContactSiteConfig();
  return {
    phone: local.phone || remote?.phone || DEFAULT_CONTACT.phone,
    email: local.email || remote?.email || DEFAULT_CONTACT.email,
    whatsappNumber: local.whatsappNumber || remote?.whatsappNumber || "",
    whatsappMessage: local.whatsappMessage || remote?.whatsappMessage || DEFAULT_CONTACT.whatsappMessage,
  };
}

type PublicFeaturesResponse = {
  contact_widget_home?: boolean;
  whatsapp_balloon?: boolean;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  whatsapp_prefill?: string;
};

export async function fetchPublicFeatures(): Promise<PublicFeatures> {
  const now = Date.now();
  if (cached && now - cacheTs < CACHE_MS) return cached;

  try {
    // Relative path — works in browser via Next `/api/v1/[...path]` proxy.
    // Do not use backendBase() here; that resolves to localhost/private URLs in the client.
    const data = await apiFetch<PublicFeaturesResponse>("/api/v1/settings/public/", {
      cache: "no-store",
    });
    cached = {
      contact_widget_home: data.contact_widget_home === true,
      whatsapp_balloon: data.whatsapp_balloon === true,
      contact: mergeContact({
        email: data.contact_email,
        phone: data.contact_phone,
        whatsappNumber: data.whatsapp_number,
        whatsappMessage: data.whatsapp_prefill,
      }),
    };
    cacheTs = now;
    return cached;
  } catch {
    cached = { ...FALLBACK_FEATURES, contact: mergeContact(undefined) };
    cacheTs = now;
    return cached;
  }
}

export function invalidatePublicFeaturesCache() {
  cached = null;
  cacheTs = 0;
}
