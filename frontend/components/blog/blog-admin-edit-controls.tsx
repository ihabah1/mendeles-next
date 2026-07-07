"use client";

import { Link } from "@/lib/i18n/navigation";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import { useBlogAdminEdit } from "@/components/blog/blog-admin-edit-context";

type Props = {
  postId: string;
  title: string;
  locale?: string;
};

export function BlogAdminSelectControl({ postId, title, locale = "he" }: Props) {
  const { canEdit, isSelected, selectPost } = useBlogAdminEdit();
  const copy = editorialCopy(locale);
  if (!canEdit) return null;

  const selected = isSelected(postId);

  return (
    <button
      type="button"
      aria-label={selected ? copy.editDeselectArticle : copy.editSelectArticle}
      aria-pressed={selected}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        selectPost(postId, title);
      }}
      className={`absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg transition ${
        selected
          ? "border-[#6F42F5] bg-[#6F42F5] text-white"
          : "border-white/90 bg-white/95 text-slate-600 hover:border-[#6F42F5] hover:text-[#6F42F5]"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
        {selected ? (
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <rect x="4" y="4" width="16" height="16" rx="3" />
        )}
      </svg>
    </button>
  );
}

export function BlogAdminEditToolbar({ locale = "he" }: { locale?: string }) {
  const { canEdit, selectedPostId, selectedPostTitle, clearSelection } = useBlogAdminEdit();
  const copy = editorialCopy(locale);

  if (!canEdit || !selectedPostId) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,42rem)] -translate-x-1/2 rounded-2xl border border-[#6F42F5]/30 bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.18)]">
      <div className={`flex flex-wrap items-center justify-between gap-3 ${locale === "en" ? "text-left" : "text-right"}`}>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6F42F5]">{copy.editModeLabel}</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900">{selectedPostTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {copy.editClearSelection}
          </button>
          <Link
            href={`/dashboard/studio/articles?pageId=${selectedPostId}`}
            className="rounded-xl bg-[#6F42F5] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_rgba(111,66,245,0.35)] transition hover:bg-[#5a32d4]"
          >
            {copy.openInStudio}
          </Link>
        </div>
      </div>
    </div>
  );
}
