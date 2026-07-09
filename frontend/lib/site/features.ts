import { backendBase } from "@/lib/api/backend-url";

export type PublicFeatures = {
  contact_widget_home: boolean;
};

const DEFAULT_FEATURES: PublicFeatures = {
  contact_widget_home: true,
};

let cached: PublicFeatures | null = null;
let cacheTs = 0;
const CACHE_MS = 60_000;

export async function fetchPublicFeatures(): Promise<PublicFeatures> {
  const now = Date.now();
  if (cached && now - cacheTs < CACHE_MS) return cached;

  try {
    const res = await fetch(`${backendBase()}/api/v1/settings/public/`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return DEFAULT_FEATURES;
    const data = (await res.json()) as PublicFeatures;
    cached = {
      contact_widget_home: data.contact_widget_home !== false,
    };
    cacheTs = now;
    return cached;
  } catch {
    return DEFAULT_FEATURES;
  }
}

export function invalidatePublicFeaturesCache() {
  cached = null;
  cacheTs = 0;
}
