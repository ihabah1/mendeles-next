import { backendBase } from "@/lib/api/backend-url";
import type { ContactSiteConfig } from "@/lib/contact/site-config";
import { getContactSiteConfig } from "@/lib/contact/site-config";

export type PublicFeatures = {
  contact_widget_home: boolean;
  contact: ContactSiteConfig;
};

const DEFAULT_CONTACT: ContactSiteConfig = {
  phone: "972537985362",
  email: "mendelessupport@gmail.com",
  whatsappNumber: "972537985362",
  whatsappMessage: "שלום Mendeles",
};

const DEFAULT_FEATURES: PublicFeatures = {
  contact_widget_home: true,
  contact: DEFAULT_CONTACT,
};

let cached: PublicFeatures | null = null;
let cacheTs = 0;
const CACHE_MS = 60_000;

function mergeContact(remote: Partial<ContactSiteConfig> | undefined): ContactSiteConfig {
  const local = getContactSiteConfig();
  return {
    phone: local.phone || remote?.phone || DEFAULT_CONTACT.phone,
    email: local.email || remote?.email || DEFAULT_CONTACT.email,
    whatsappNumber: local.whatsappNumber || remote?.whatsappNumber || "",
    whatsappMessage: local.whatsappMessage || remote?.whatsappMessage || DEFAULT_CONTACT.whatsappMessage,
  };
}

export async function fetchPublicFeatures(): Promise<PublicFeatures> {
  const now = Date.now();
  if (cached && now - cacheTs < CACHE_MS) return cached;

  try {
    const res = await fetch(`${backendBase()}/api/v1/settings/public/`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      cached = { ...DEFAULT_FEATURES, contact: mergeContact(undefined) };
      cacheTs = now;
      return cached;
    }
    const data = (await res.json()) as {
      contact_widget_home?: boolean;
      contact_email?: string;
      contact_phone?: string;
      whatsapp_number?: string;
      whatsapp_prefill?: string;
    };
    cached = {
      contact_widget_home: data.contact_widget_home !== false,
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
    cached = { ...DEFAULT_FEATURES, contact: mergeContact(undefined) };
    cacheTs = now;
    return cached;
  }
}

export function invalidatePublicFeaturesCache() {
  cached = null;
  cacheTs = 0;
}
