import { pickCuratedPhoto } from "@/lib/blog/stock-photos";

const BROKEN_IMAGE_REPLACEMENTS: Record<string, string> = {
  "https://images.unsplash.com/photo-1559526324-cb2f9661f44e?auto=format&fit=crop&w=1600&q=80":
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
};

export function resolvePublicImageUrl(
  url: string,
  context?: { matched_domain?: string; category?: string; seed?: string },
): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return pickCuratedPhoto(
      context?.category || "business",
      context?.matched_domain || "business",
      context?.seed || "public-image",
    );
  }
  return BROKEN_IMAGE_REPLACEMENTS[trimmed] || trimmed;
}
