import { BlogReadLink } from "@/components/blog/blog-read-link";
import { EditorialCardImage } from "@/components/blog/editorial-card-image";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCardPost } from "@/lib/blog/types";
import { formatPublishDate } from "@/lib/blog/utils";

type Props = {
  post: BlogCardPost;
  locale?: string;
};

export function HeroArticle({ post, locale = "he" }: Props) {
  const copy = editorialCopy(locale);
  const align = locale === "en" ? "text-left" : "text-right";

  return (
    <article className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
      <div className="relative min-h-[360px] sm:min-h-[440px] lg:min-h-[500px]">
        <EditorialCardImage
          src={post.image_url}
          alt={post.title}
          category={post.category}
          categorySlug={post.category_slug}
          seed={post.id}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 70vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-transparent" />

        <span className="absolute right-5 top-5 rounded-full bg-[#6F42F5] px-3.5 py-1 text-xs font-bold text-white shadow-lg">
          {post.category}
        </span>

        <div
          className={`absolute bottom-5 left-5 max-w-xl rounded-2xl border border-white/50 bg-white/75 p-6 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-md sm:p-8 ${align}`}
        >
          <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl lg:text-4xl">{post.title}</h2>
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 sm:text-base">{post.meta_description}</p>

          <div className={`mt-5 flex items-center gap-3 ${locale === "en" ? "" : "flex-row-reverse justify-end"}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6F42F5] text-sm font-bold text-white">
              M
            </span>
            <div className="text-sm">
              <p className="font-bold text-slate-900">{copy.team}</p>
              <p className="text-slate-500">
                {formatPublishDate(post.published_at, locale)} · {post.reading_minutes} {copy.readingMinutes}
              </p>
            </div>
          </div>

          <BlogReadLink
            href={post.full_path}
            postId={post.id}
            className="mt-6 inline-flex w-fit rounded-2xl bg-[#6F42F5] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(111,66,245,0.35)] transition hover:bg-[#5a32d4]"
          >
            {copy.readArticle}
          </BlogReadLink>
        </div>
      </div>
    </article>
  );
}
