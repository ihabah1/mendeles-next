"use client";

import { useState } from "react";
import Image from "next/image";
import { pickCuratedPhoto } from "@/lib/blog/stock-photos";
import { resolvePublicImageUrl } from "@/lib/blog/public-image";

type Props = {
  src: string;
  alt: string;
  category?: string;
  categorySlug?: string;
  seed?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
};

export function EditorialCardImage({
  src,
  alt,
  category = "business",
  categorySlug = "",
  seed = "",
  fill,
  width,
  height,
  sizes,
  className = "",
  priority,
  loading,
}: Props) {
  const initial = resolvePublicImageUrl(src, { category, matched_domain: categorySlug, seed: seed || src });
  const [imageSrc, setImageSrc] = useState(initial);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      priority={priority}
      loading={loading}
      onError={() =>
        setImageSrc(pickCuratedPhoto(category, categorySlug, `${seed || src}-fallback`))
      }
    />
  );
}
