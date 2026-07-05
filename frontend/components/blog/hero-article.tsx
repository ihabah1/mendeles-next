import Image from "next/image";
import { BlogReadLink } from "@/components/blog/blog-read-link";
import type { BlogCardPost } from "@/lib/blog/types";
import { formatPublishDate } from "@/lib/blog/utils";

type Props = {
  post: BlogCardPost;
};

export function HeroArticle({ post }: Props) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="grid md:grid-cols-[3fr_2fr]">
        <div className="relative min-h-[280px] md:min-h-[420px]">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-center p-8 text-right md:p-10">
          <span className="mb-4 inline-flex w-fit self-end rounded-full bg-[#6F42F5]/10 px-3 py-1 text-xs font-bold text-[#6F42F5]">
            {post.category}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-[2.6rem]">
            {post.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600 md:text-lg">{post.meta_description}</p>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F8FC] text-sm font-bold text-[#6F42F5]">
                M
              </span>
              <div className="text-right">
                <p className="font-semibold text-slate-800">מערכת Mendeles</p>
                <p>
                  {formatPublishDate(post.published_at)} · {post.reading_minutes} דקות קריאה
                </p>
              </div>
            </div>
          </div>

          <BlogReadLink
            href={post.full_path}
            postId={post.id}
            className="mt-8 inline-flex w-fit self-end rounded-xl bg-[#6F42F5] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#5a32d4]"
          >
            קרא את המאמר
          </BlogReadLink>
        </div>
      </div>
    </article>
  );
}
