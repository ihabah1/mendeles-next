"use client";

import { useEffect, useState } from "react";
import { BlogReadLink } from "@/components/blog/blog-read-link";
import { BlogAdminSelectControl } from "@/components/blog/blog-admin-edit-controls";
import { useBlogAdminEdit } from "@/components/blog/blog-admin-edit-context";
import { EditorialCardImage } from "@/components/blog/editorial-card-image";
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
  const { isSelected } = useBlogAdminEdit();
  const copy = editorialCopy(locale);
  const selected = isSelected(post.id);

  useEffect(() => {
    setBookmarked(bookmarkedIds().has(post.id));
  }, [post.id]);

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(15,23,42,0.1)] ${
        selected ? "ring-2 ring-[#6F42F5] ring-offset-2" : ""
      }`}
    >
      <BlogReadLink href={post.full_path} postId={post.id} className="flex h-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <BlogAdminSelectControl postId={post.id} title={post.title} locale={locale} />
          <EditorialCardImage
            src={post.image_url}
            alt={post.title}
            category={post.category}
            categorySlug={post.category_slug}
            seed={post.id}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <span className="absolute bottom-3 right-3 rounded-full bg-[#6F42F5] px-3 py-1 text-[11px] font-bold text-white shadow">
            {post.category}
          </span>
        </div>
        <div className={`flex flex-1 flex-col p-5 ${locale === "en" ? "text-left" : "text-right"}`}>
          <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-slate-900 transition group-hover:text-[#6F42F5]">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-7 text-slate-600">{post.meta_description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-[#6F42F5]">{copy.readMore}</span>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                aria-label={bookmarked ? copy.bookmarkRemove : copy.bookmarkAdd}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setBookmarked(toggleBookmark(post.id));
                }}
                className={`rounded-lg p-1.5 transition ${bookmarked ? "text-[#6F42F5]" : "text-slate-400 hover:text-[#6F42F5]"}`}
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
        </div>
      </BlogReadLink>
    </article>
  );
}
