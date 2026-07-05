"use client";

import { useState } from "react";
import { BlogReadLink, type BlogCardPost } from "@/components/blog/blog-interactive";

type Props = {
  posts: BlogCardPost[];
};

export function BlogHeroCarousel({ posts }: Props) {
  const slides = posts.slice(0, 4);
  const [active, setActive] = useState(0);

  if (!slides.length) return null;

  const post = slides[active] ?? slides[0];

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/60">
      <div className="relative min-h-[320px] md:min-h-[380px]">
        <img src={post.image_url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/45 to-black/20" />

        <span className="absolute left-4 top-4 rounded-md bg-[#5e35b1] px-3 py-1 text-xs font-bold text-white shadow">
          מומלץ
        </span>

        <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
          <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{post.category}</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 text-right md:p-8">
          <h2 className="max-w-2xl text-2xl font-bold leading-tight text-white md:text-4xl">{post.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/85 md:text-base">{post.meta_description}</p>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white backdrop-blur">
                M
              </span>
              <div className="text-right text-xs text-white/80">
                <p>מאת מערכת Mendeles</p>
                <p>
                  {post.published_at ? new Date(post.published_at).toLocaleDateString("he-IL") : "ללא תאריך"} · {post.reading_minutes} דקות קריאה
                </p>
              </div>
            </div>
            <BlogReadLink
              post={post}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#5e35b1] transition hover:bg-white/90"
            >
              קרא עכשיו
            </BlogReadLink>
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-white py-4">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`מאמר מומלץ ${index + 1}`}
              onClick={() => setActive(index)}
              className={`h-2.5 rounded-full transition ${
                index === active ? "w-8 bg-[#5e35b1]" : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
