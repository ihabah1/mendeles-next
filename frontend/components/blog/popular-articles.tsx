"use client";

import { useEffect, useState } from "react";
import { BlogReadLink } from "@/components/blog/blog-read-link";
import { EditorialCardImage } from "@/components/blog/editorial-card-image";
import { readCounts } from "@/lib/blog/reads";
import type { BlogCardPost } from "@/lib/blog/types";

type Props = {
  posts: BlogCardPost[];
  locale?: string;
};

export function PopularArticles({ posts, locale = "he" }: Props) {
  const [ranked, setRanked] = useState<BlogCardPost[]>(posts.slice(0, 5));

  useEffect(() => {
    const reads = readCounts();
    const sorted = [...posts].sort((a, b) => {
      const readDiff = (reads[b.id] || 0) - (reads[a.id] || 0);
      if (readDiff !== 0) return readDiff;
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });
    setRanked(sorted.slice(0, 5));
  }, [posts]);

  return (
    <section className={`rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ${locale === "en" ? "text-left" : "text-right"}`}>
      <h2 className="text-lg font-bold text-slate-900">{locale === "en" ? "Popular articles" : "מאמרים פופולריים"}</h2>
      <div className="mt-5 space-y-4">
        {!ranked.length ? (
          <p className="text-sm text-slate-500">{locale === "en" ? "No articles yet." : "אין עדיין מאמרים."}</p>
        ) : (
          ranked.map((post) => (
            <BlogReadLink
              key={post.id}
              href={post.full_path}
              postId={post.id}
              className="group flex items-center gap-3 rounded-xl p-1 transition hover:bg-pink-50/80"
            >
              <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-800 group-hover:text-[#6F42F5]">
                {post.title}
              </p>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <EditorialCardImage
                  src={post.image_url}
                  alt=""
                  category={post.category}
                  categorySlug={post.category_slug}
                  seed={post.id}
                  fill
                  loading="lazy"
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            </BlogReadLink>
          ))
        )}
      </div>
    </section>
  );
}
