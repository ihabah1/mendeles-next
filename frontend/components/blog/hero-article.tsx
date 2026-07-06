import Image from "next/image";
import { BlogReadLink } from "@/components/blog/blog-read-link";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCardPost } from "@/lib/blog/types";
import { formatPublishDate } from "@/lib/blog/utils";

type Props = {
  post: BlogCardPost;
  locale?: string;
};

export function HeroArticle({ post, locale = "he" }: Props) {
  const copy = editorialCopy(locale);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="grid lg:grid-cols-[3fr_2fr]">
        <div className="relative min-h-[320px] lg:min-h-[480px]">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-[#6F42F5] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
            {copy.featured}
          </span>
        </div>

        <div className={`flex flex-col justify-center p-8 lg:p-10 ${locale === "en" ? "text-left" : "text-right"}`}>
          <span
            className={`mb-4 inline-flex w-fit rounded-full border border-[#6F42F5]/20 bg-[#6F42F5]/8 px-4 py-1.5 text-xs font-bold text-[#6F42F5] ${
              locale === "en" ? "self-start" : "self-end"
            }`}
          >
            {post.category}
          </span>
          <h2 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 lg:text-[2.75rem]">
            {post.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600 lg:text-lg">{post.meta_description}</p>

          <div className={`mt-7 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6 ${locale === "en" ? "" : "justify-end"}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6F42F5] text-sm font-bold text-white">
                M
              </span>
              <div className={`text-sm ${locale === "en" ? "text-left" : "text-right"}`}>
                <p className="font-bold text-slate-900">{copy.team}</p>
                <p className="text-slate-500">
                  {formatPublishDate(post.published_at, locale)} · {post.reading_minutes} {copy.readingMinutes}
                </p>
              </div>
            </div>
          </div>

          <BlogReadLink
            href={post.full_path}
            postId={post.id}
            className={`mt-8 inline-flex w-fit rounded-2xl bg-[#6F42F5] px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(111,66,245,0.35)] transition hover:bg-[#5a32d4] ${
              locale === "en" ? "self-start" : "self-end"
            }`}
          >
            {copy.readArticle}
          </BlogReadLink>
        </div>
      </div>
    </article>
  );
}
