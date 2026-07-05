"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/lib/i18n/navigation";
import type { BlogCardPost } from "@/lib/blog/types";
import { formatPublishDate } from "@/lib/blog/utils";

type Props = {
  posts: BlogCardPost[];
};

export function ArticlePreviewDrawer({ posts }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleSlug = searchParams.get("article");
  const [open, setOpen] = useState(Boolean(articleSlug));

  const post = posts.find((item) => item.full_path.includes(`article=${articleSlug}`) && item.is_preview) ?? null;

  useEffect(() => {
    setOpen(Boolean(articleSlug && post));
  }, [articleSlug, post]);

  if (!open || !post) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="relative h-56 sm:h-72">
          <Image src={post.image_url} alt={post.title} fill className="object-cover" sizes="768px" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.replace("/blog");
            }}
            className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-700"
          >
            סגור
          </button>
          <span className="absolute bottom-4 right-4 rounded-full bg-[#6F42F5] px-3 py-1 text-xs font-bold text-white">
            {post.category}
          </span>
        </div>
        <div className="space-y-4 p-6 text-right sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F42F5]">תצוגה לדוגמה</p>
          <h2 id="article-preview-title" className="text-3xl font-extrabold leading-tight text-slate-900">
            {post.title}
          </h2>
          <p className="text-sm text-slate-500">
            {formatPublishDate(post.published_at)} · {post.reading_minutes} דקות קריאה
          </p>
          <p className="text-base leading-8 text-slate-600">{post.meta_description}</p>
          {post.preview_body ? <p className="text-base leading-8 text-slate-700">{post.preview_body}</p> : null}
          <div className="rounded-2xl border border-[#6F42F5]/15 bg-[#F7F8FC] p-4 text-sm leading-7 text-slate-600">
            זהו מאמר לדוגמה. כדי לפרסם תוכן אמיתי בבלוג, צרו ופרסמו מאמרים מ
            <Link href="/dashboard/workspace" className="font-semibold text-[#6F42F5] hover:underline">
              {" "}
              ממשק העבודה
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
