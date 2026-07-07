"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/i18n/navigation";
import {
  aiSeoApi,
  contentApi,
  type ContentPage,
  type ContentPageDetail,
} from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { pageLocale } from "@/components/workspace/workspace-helpers";

type StudioKind = "blog" | "landing_page";

const STUDIO_META: Record<
  StudioKind,
  { title: string; subtitle: string; emptyLabel: string; pageType: string }
> = {
  blog: {
    title: "סטודיו כתבות",
    subtitle: "עריכת מאמרים בסגנון ויקיפדיה — כותרת, תוכן HTML, תמונה ופרסום",
    emptyLabel: "אין כתבות עדיין",
    pageType: "blog",
  },
  landing_page: {
    title: "סטודיו דפי נחיתה",
    subtitle: "מרכז כל דפי הנחיתה — בחרו דף לעריכה והחלפת תמונה אוטומטית",
    emptyLabel: "אין דפי נחיתה עדיין",
    pageType: "landing_page",
  },
};

function blockHtml(block: ContentPageDetail["blocks"][number]): string {
  const config = block.config || {};
  if (typeof config.html === "string") return config.html;
  if (typeof config.content === "string") return config.content;
  if (typeof config.headline === "string") return `<h2>${config.headline}</h2>`;
  return "";
}

function imageUrl(page: ContentPageDetail | null): string | null {
  if (!page) return null;
  const imageBlock = page.blocks.find((b) => b.block_type === "image");
  const url = imageBlock?.config?.url;
  return typeof url === "string" ? url : null;
}

export function ContentStudioHub({ kind }: { kind: StudioKind }) {
  const meta = STUDIO_META[kind];
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("content.edit");
  const canDelete = hasPermission("content.delete") || hasPermission("ai_seo.manage");
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMetaTitle, setDraftMetaTitle] = useState("");
  const [draftMetaDescription, setDraftMetaDescription] = useState("");
  const [draftBlocks, setDraftBlocks] = useState<Record<string, string>>({});
  const [imageDomain, setImageDomain] = useState("");
  const [imageContext, setImageContext] = useState("");

  const domainsQuery = useQuery({
    queryKey: ["ai-seo-workspace-domains"],
    queryFn: aiSeoApi.workspace,
    staleTime: 5 * 60_000,
  });
  const domainOptions = domainsQuery.data?.domains ?? [];

  const listQuery = useQuery({
    queryKey: ["content-studio", kind],
    queryFn: () => contentApi.listPages({ page_type: meta.pageType }),
  });

  const detailQuery = useQuery({
    queryKey: ["content-studio-detail", selectedId],
    queryFn: () => contentApi.getPage(selectedId!),
    enabled: Boolean(selectedId),
  });

  const pages = listQuery.data?.results ?? [];
  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((page) =>
      [page.title, page.slug, page.full_path, page.status].some((part) => part.toLowerCase().includes(q)),
    );
  }, [pages, search]);

  const editableBlocks = useMemo(
    () =>
      (detailQuery.data?.blocks ?? []).filter(
        (block) =>
          block.block_type !== "image" &&
          block.block_type !== "form" &&
          (blockHtml(block) !== "" || ["rich_text", "hero", "cta", "html"].includes(block.block_type)),
      ),
    [detailQuery.data?.blocks],
  );

  function selectPage(page: ContentPage) {
    setSelectedId(page.id);
    setImageDomain("");
    setImageContext("");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!selectedId || !detailQuery.data) return;
      await contentApi.updatePage(selectedId, {
        title: draftTitle,
        meta_title: draftMetaTitle,
        meta_description: draftMetaDescription,
      });
      for (const block of editableBlocks) {
        const html = draftBlocks[block.id];
        if (html === undefined) continue;
        const key = block.config?.html !== undefined ? "html" : block.config?.content !== undefined ? "content" : "html";
        await contentApi.updateBlock(selectedId, block.id, {
          config: { ...block.config, [key]: html },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-studio", kind] });
      qc.invalidateQueries({ queryKey: ["content-studio-detail", selectedId] });
    },
  });

  const swapImage = useMutation({
    mutationFn: () =>
      aiSeoApi.swapWorkspacePageImage(selectedId!, {
        domain: imageDomain || undefined,
        context: imageContext.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-studio-detail", selectedId] });
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
    },
  });

  const remove = useMutation({
    mutationFn: () => aiSeoApi.deleteWorkspacePage(selectedId!),
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["content-studio", kind] });
    },
  });

  const selectedPage = detailQuery.data ?? null;
  const previewImage = imageUrl(selectedPage);

  useEffect(() => {
    if (!detailQuery.data) return;
    setDraftTitle(detailQuery.data.title);
    setDraftMetaTitle(detailQuery.data.meta_title || "");
    setDraftMetaDescription(detailQuery.data.meta_description || "");
    const nextBlocks: Record<string, string> = {};
    for (const block of detailQuery.data.blocks) {
      if (block.block_type === "image" || block.block_type === "form") continue;
      nextBlocks[block.id] = blockHtml(block);
    }
    setDraftBlocks(nextBlocks);
  }, [detailQuery.data]);

  return (
    <div className="workspace-studio -m-6 min-h-full bg-[#080c16] p-4 text-slate-100 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">{meta.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{meta.subtitle}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-[#12182a] p-4">
          <input
            type="search"
            placeholder="חיפוש…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-200"
          />
          <p className="mt-3 text-xs text-slate-500">{filteredPages.length} פריטים</p>
          <ul className="mt-3 max-h-[70vh] space-y-1 overflow-auto">
            {listQuery.isLoading ? (
              <li className="text-sm text-slate-400">טוען…</li>
            ) : filteredPages.length === 0 ? (
              <li className="text-sm text-slate-400">{meta.emptyLabel}</li>
            ) : (
              filteredPages.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => selectPage(page)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-start text-sm transition ${
                      selectedId === page.id
                        ? "border-[#6F42F5] bg-[#6F42F5]/15 text-white"
                        : "border-transparent bg-white/5 text-slate-300 hover:border-white/10"
                    }`}
                  >
                    <span className="block truncate font-medium">{page.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {page.full_path} · {page.status}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-[#12182a] p-5">
          {!selectedId ? (
            <p className="text-sm text-slate-400">בחרו פריט מהרשימה לעריכה.</p>
          ) : detailQuery.isLoading ? (
            <p className="text-sm text-slate-400">טוען עורך…</p>
          ) : !selectedPage ? (
            <p className="text-sm text-red-400">לא ניתן לטעון את הדף.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">{selectedPage.full_path}</p>
                  <Link
                    href={selectedPage.full_path}
                    locale={pageLocale(selectedPage.locale)}
                    className="text-sm text-violet-300 hover:underline"
                  >
                    צפייה באתר
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEdit && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={save.isPending}
                        onClick={() => save.mutate()}
                        className="bg-[#6F42F5] hover:bg-[#5a32d4]"
                      >
                        שמור
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={swapImage.isPending}
                        onClick={() => swapImage.mutate()}
                        className="border-white/10 bg-white/5"
                      >
                        {swapImage.isPending ? "מחפש תמונה…" : "מצא תמונה מתאימה"}
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm("למחוק את הדף?")) remove.mutate();
                      }}
                      className="border-red-500/30 text-red-300"
                    >
                      מחק
                    </Button>
                  )}
                </div>
              </div>

              {previewImage && (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewImage} alt="" className="max-h-56 w-full object-cover" />
                </div>
              )}

              {canEdit && selectedPage && (
                <div className="rounded-xl border border-white/10 bg-[#0b1020]/60 p-4">
                  <p className="text-sm font-medium text-slate-200">החלפת תמונה לפי תחום</p>
                  <p className="mt-1 text-xs text-slate-500">
                    בחרו תחום מהרשימה או הקלידו מילות חיפוש — המערכת תמצא תמונה מסחרית מתאימה.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm sm:col-span-1">
                      <span className="mb-1 block text-slate-400">תחום</span>
                      <select
                        value={imageDomain}
                        onChange={(e) => setImageDomain(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-slate-100"
                      >
                        <option value="">אוטומטי (לפי הכתבה)</option>
                        {domainOptions.map((domain) => (
                          <option key={domain.value} value={domain.value}>
                            {domain.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm sm:col-span-1">
                      <span className="mb-1 block text-slate-400">מילות חיפוש</span>
                      <input
                        type="text"
                        value={imageContext}
                        onChange={(e) => setImageContext(e.target.value)}
                        placeholder="לדוגמה: רכבת, ביטוח, עורך דין…"
                        className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-slate-100 placeholder:text-slate-600"
                      />
                    </label>
                  </div>
                </div>
              )}

              {canEdit ? (
                <div className="space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-300">כותרת</span>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-slate-100"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-300">Meta title</span>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-slate-100"
                      value={draftMetaTitle}
                      onChange={(e) => setDraftMetaTitle(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-300">Meta description</span>
                    <textarea
                      className="min-h-20 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-slate-100"
                      value={draftMetaDescription}
                      onChange={(e) => setDraftMetaDescription(e.target.value)}
                    />
                  </label>
                  {editableBlocks.map((block, index) => (
                    <label key={block.id} className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-300">
                        בלוק {index + 1} ({block.block_type})
                      </span>
                      <textarea
                        className="min-h-40 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 font-mono text-xs text-slate-100"
                        value={draftBlocks[block.id] ?? ""}
                        onChange={(e) =>
                          setDraftBlocks((prev) => ({ ...prev, [block.id]: e.target.value }))
                        }
                        spellCheck={false}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">אין הרשאת עריכה.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
