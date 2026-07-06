import Image from "next/image";
import { BlogReadLink } from "@/components/blog/blog-read-link";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCardPost } from "@/lib/blog/types";
import { formatPublishDate } from "@/lib/blog/utils";

type Props = {
  posts: BlogCardPost[];
  locale?: string;
};

export function FeaturedStrip({ posts, locale = "he" }: Props) {
  const copy = editorialCopy(locale);
  const items = posts.slice(0, 3);
  if (!items.length) return null;

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {items.map((post) => (
        <article
          key={post.id}
          className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
        >
          <BlogReadLink href={post.full_path} postId={post.id} className="block">
            <div className="relative h-36 overflow-hidden">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#6F42F5]">
                {post.category}
              </span>
            </div>
            <div className={`p-4 ${locale === "en" ? "text-left" : "text-right"}`}>
              <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-[#6F42F5]">
                {post.title}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                {formatPublishDate(post.published_at, locale)} · {post.reading_minutes} {copy.minShort}
              </p>
            </div>
          </BlogReadLink>
        </article>
      ))}
    </section>
  );
}
