"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BlogReadLink } from "@/components/blog/blog-read-link";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import { bookmarkedIds, toggleBookmark } from "@/lib/blog/reads";
import type { BlogCardPost } from "@/lib/blog/types";
import { formatPublishDate } from "@/lib/blog/utils";

type Props = {
  post: BlogCardPost;
  locale?: string;
};

export function ArticleCard({ post, locale = "he" }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const copy = editorialCopy(locale);

  useEffect(() => {
    setBookmarked(bookmarkedIds().has(post.id));
  }, [post.id]);

  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]">
      <BlogReadLink href={post.full_path} postId={post.id} className="block">
        <div className="relative aspect-video overflow-hidden bg-slate-100">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
          <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#6F42F5] shadow">
            {post.category}
          </span>
        </div>
        <div className={`p-6 ${locale === "en" ? "text-left" : "text-right"}`}>
          <h3 className="line-clamp-2 text-xl font-extrabold leading-snug text-slate-900 transition group-hover:text-[#6F42F5]">
            {post.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.meta_description}</p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <button
              type="button"
              aria-label={bookmarked ? copy.bookmarkRemove : copy.bookmarkAdd}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setBookmarked(toggleBookmark(post.id));
              }}
              className={`rounded-lg p-2 transition ${bookmarked ? "text-[#6F42F5]" : "text-slate-400 hover:bg-[#F7F8FC] hover:text-[#6F42F5]"}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="font-medium">
              {formatPublishDate(post.published_at, locale)} · {post.reading_minutes} {copy.readingMinutes}
            </span>
          </div>
        </div>
      </BlogReadLink>
    </article>
  );
}
