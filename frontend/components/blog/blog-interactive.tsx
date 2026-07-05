"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";

export type BlogCardPost = {
  id: string;
  title: string;
  full_path: string;
  meta_description: string;
  published_at: string | null;
  image_url: string;
  category: string;
  reading_minutes: number;
};

const READS_KEY = "mendeles-blog-reads";
const RATINGS_KEY = "mendeles-blog-ratings";

function readCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(READS_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function ratingMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(RATINGS_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function trackBlogRead(postId: string) {
  if (typeof window === "undefined") return;
  const counts = readCounts();
  counts[postId] = (counts[postId] || 0) + 1;
  window.localStorage.setItem(READS_KEY, JSON.stringify(counts));
}

function averageRating(postId: string, ratings: Record<string, number>): number {
  const value = ratings[postId];
  return typeof value === "number" ? value : 0;
}

export function BlogRating({ postId, size = "sm" }: { postId: string; size?: "sm" | "md" }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    setRating(averageRating(postId, ratingMap()));
  }, [postId]);

  function saveRating(value: number) {
    const ratings = ratingMap();
    ratings[postId] = value;
    window.localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
    setRating(value);
  }

  const starSize = size === "md" ? "text-base" : "text-sm";

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="דרג מאמר">
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        const active = value <= (hover || rating);
        return (
          <button
            key={value}
            type="button"
            className={`${starSize} transition hover:scale-110 ${active ? "text-amber-400" : "text-slate-300"}`}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => saveRating(value)}
            aria-label={`דרג ${value} מתוך 5`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export function BlogReadLink({ post, children, className }: { post: BlogCardPost; children: ReactNode; className?: string }) {
  return (
    <Link href={post.full_path} className={className} onClick={() => trackBlogRead(post.id)}>
      {children}
    </Link>
  );
}

export function BlogTopArticlesPanel({ posts }: { posts: BlogCardPost[] }) {
  const [ranked, setRanked] = useState<BlogCardPost[]>(posts.slice(0, 5));

  useEffect(() => {
    const reads = readCounts();
    const ratings = ratingMap();
    const sorted = [...posts].sort((a, b) => {
      const readDiff = (reads[b.id] || 0) - (reads[a.id] || 0);
      if (readDiff !== 0) return readDiff;
      const ratingDiff = (ratings[b.id] || 0) - (ratings[a.id] || 0);
      if (ratingDiff !== 0) return ratingDiff;
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });
    setRanked(sorted.slice(0, 5));
  }, [posts]);

  if (!ranked.length) {
    return <p className="text-sm text-slate-500">אין עדיין מאמרים.</p>;
  }

  return (
    <div className="space-y-3">
      {ranked.map((post, index) => (
        <BlogReadLink
          key={post.id}
          post={post}
          className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-slate-200 hover:bg-slate-50"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
              index === 0
                ? "bg-[#5e35b1] text-white"
                : index === 1
                  ? "bg-slate-700 text-white"
                  : index === 2
                    ? "bg-slate-500 text-white"
                    : "bg-slate-100 text-slate-600"
            }`}
          >
            {index + 1}
          </span>
          <img src={post.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <p className="min-w-0 flex-1 text-right text-sm font-semibold leading-5 text-slate-800 group-hover:text-[#5e35b1]">
            {post.title}
          </p>
        </BlogReadLink>
      ))}
    </div>
  );
}

export function BlogArticleCard({ post }: { post: BlogCardPost }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <BlogReadLink post={post} className="block">
        <div className="relative overflow-hidden">
          <img
            src={post.image_url}
            alt={post.title}
            className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#5e35b1] shadow-sm">
            {post.category}
          </span>
        </div>
        <div className="p-4 text-right">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-[#5e35b1]">{post.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{post.meta_description}</p>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              {post.published_at ? new Date(post.published_at).toLocaleDateString("he-IL") : "ללא תאריך"} · {post.reading_minutes} דקות קריאה
            </span>
            <span className="text-slate-400" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </BlogReadLink>
    </article>
  );
}

export function BlogNewsletterCard() {
  return (
    <section id="newsletter" className="rounded-xl border border-[#5e35b1]/15 bg-[#f3f0ff] p-5 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#5e35b1]/10 text-[#5e35b1]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 4h16v16H4z" strokeLinejoin="round" />
          <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-3 text-base font-bold text-slate-900">קבלו עדכונים חדשים</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">מדריכים, טיפים וכלים לצמיחת האתר — ישירות לתיבה.</p>
      <form className="mt-4 space-y-2">
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#5e35b1]/50"
          placeholder="הכניסו את האימייל שלכם"
          type="email"
        />
        <button className="w-full rounded-lg bg-[#5e35b1] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#4a2a9c]" type="button">
          הרשמו עכשיו
        </button>
      </form>
    </section>
  );
}
