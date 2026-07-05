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

  const starSize = size === "md" ? "text-lg" : "text-sm";

  return (
    <div className="flex items-center gap-1" role="group" aria-label="דרג מאמר">
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        const active = value <= (hover || rating);
        return (
          <button
            key={value}
            type="button"
            className={`${starSize} transition hover:scale-110 ${active ? "text-amber-400" : "text-white/20"}`}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => saveRating(value)}
            aria-label={`דרג ${value} מתוך 5`}
          >
            ★
          </button>
        );
      })}
      {rating > 0 && <span className="ms-1 text-xs text-slate-400">{rating.toFixed(1)}</span>}
    </div>
  );
}

export function BlogReadLink({ post, children, className }: { post: BlogCardPost; children: ReactNode; className?: string }) {
  return (
    <Link
      href={post.full_path}
      className={className}
      onClick={() => trackBlogRead(post.id)}
    >
      {children}
    </Link>
  );
}

export function BlogMostReadPanel({ posts }: { posts: BlogCardPost[] }) {
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
    return <p className="text-sm text-slate-400">אין עדיין מאמרים לדירוג.</p>;
  }

  return (
    <div className="space-y-3">
      {ranked.map((post, index) => (
        <BlogReadLink
          key={post.id}
          post={post}
          className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-violet-400/30 hover:bg-white/[0.06]"
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
              index === 0
                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950"
                : index === 1
                  ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900"
                  : index === 2
                    ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100"
                    : "bg-white/10 text-violet-300"
            }`}
          >
            {index + 1}
          </span>
          <img src={post.image_url} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1 text-right">
            <p className="line-clamp-2 text-sm font-bold leading-5 text-white group-hover:text-violet-200">{post.title}</p>
            <p className="mt-1 text-xs text-slate-500">{post.reading_minutes} דק׳ · {post.category}</p>
          </div>
        </BlogReadLink>
      ))}
    </div>
  );
}

export function BlogArticleCard({ post, featured = false }: { post: BlogCardPost; featured?: boolean }) {
  const [reads, setReads] = useState(0);

  useEffect(() => {
    setReads(readCounts()[post.id] || 0);
  }, [post.id]);

  return (
    <article
      className={`group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-violet-400/40 ${
        featured ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      <BlogReadLink post={post} className="block">
        <div className="relative overflow-hidden">
          <img
            src={post.image_url}
            alt={post.title}
            className={`w-full object-cover transition duration-500 group-hover:scale-105 ${featured ? "h-64 md:h-80" : "h-48"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />
          <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {post.category}
          </span>
          {reads > 0 && (
            <span className="absolute left-4 top-4 rounded-full bg-violet-500/90 px-3 py-1 text-xs font-bold text-white">
              {reads} קריאות
            </span>
          )}
        </div>
        <div className="p-5 text-right">
          <h3 className={`font-black leading-tight text-white ${featured ? "text-2xl md:text-3xl" : "text-lg"}`}>{post.title}</h3>
          <p className={`mt-2 text-slate-400 ${featured ? "line-clamp-3 text-sm" : "line-clamp-2 text-sm"}`}>{post.meta_description}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <BlogRating postId={post.id} />
            <span className="text-xs text-slate-500">
              {post.published_at ? new Date(post.published_at).toLocaleDateString("he-IL") : "ללא תאריך"} · {post.reading_minutes} דק׳
            </span>
          </div>
        </div>
      </BlogReadLink>
    </article>
  );
}
