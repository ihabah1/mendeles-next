"use client";

import { useState } from "react";
import Image from "next/image";
import { pickCuratedPhoto } from "@/lib/blog/stock-photos";
import { resolvePublicImageUrl } from "@/lib/blog/public-image";

type Props = {
  src: string;
  alt: string;
  caption?: string;
  matchedDomain?: string;
  className?: string;
};

export function PublicArticleImage({ src, alt, caption, matchedDomain, className = "" }: Props) {
  const initial = resolvePublicImageUrl(src, { matched_domain: matchedDomain, category: matchedDomain, seed: src });
  const [imageSrc, setImageSrc] = useState(initial);

  return (
    <figure className={`overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] ${className}`}>
      <div className="relative h-72 w-full sm:h-96">
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 896px"
          className="object-cover"
          onError={() => {
            setImageSrc(
              pickCuratedPhoto(matchedDomain || "economy", matchedDomain || "economy", `${src}-fallback`),
            );
          }}
        />
      </div>
      {caption ? <figcaption className="px-5 py-3 text-xs text-slate-400">{caption}</figcaption> : null}
    </figure>
  );
}
