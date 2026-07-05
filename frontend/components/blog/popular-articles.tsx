"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BlogReadLink } from "@/components/blog/blog-read-link";
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
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <h2 className="text-lg font-bold text-slate-900">{locale === "en" ? "Popular articles" : "מאמרים פופולריים"}</h2>
      <div className="mt-5 space-y-4">
        {!ranked.length ? (
          <p className="text-sm text-slate-500">{locale === "en" ? "No articles yet." : "אין עדיין מאמרים."}</p>
        ) : (
          ranked.map((post, index) => (
            <BlogReadLink
              key={post.id}
              href={post.full_path}
              postId={post.id}
              className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-slate-200 hover:bg-[#F7F8FC]"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  index === 0 ? "bg-[#6F42F5] text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {index + 1}
              </span>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <Image src={post.image_url} alt="" fill loading="lazy" sizes="56px" className="object-cover" />
              </div>
              <p className="min-w-0 flex-1 text-right text-sm font-semibold leading-5 text-slate-800 group-hover:text-[#6F42F5]">
                {post.title}
              </p>
            </BlogReadLink>
          ))
        )}
      </div>
    </section>
  );
}
