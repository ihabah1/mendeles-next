import type { Metadata } from "next";
import { Link } from "@/lib/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { backendBase } from "@/lib/api/backend-url";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
};

type PublicBlock = {
  block_type: string;
  config: Record<string, unknown>;
  is_visible: boolean;
};

type PublicBlogPage = {
  id: string;
  title: string;
  full_path: string;
  meta_description: string;
  published_at: string | null;
  blocks: PublicBlock[];
  terms: Array<{ name: string; slug: string; taxonomy: string }>;
};

type BlogFeed = {
  results: PublicBlogPage[];
  categories: Array<{ slug: string; name: string }>;
};

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function firstImage(page: PublicBlogPage): Record<string, unknown> | null {
  return page.blocks.find((block) => block.block_type === "image" && block.is_visible)?.config ?? null;
}

async function fetchBlogFeed(locale: string, q = "", category = ""): Promise<BlogFeed> {
  const url = new URL("/api/v1/content/public/pages/", backendBase());
  url.searchParams.set("page_type", "blog");
  url.searchParams.set("locale", locale);
  if (q) url.searchParams.set("q", q);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { results: [], categories: [] };
  return (await res.json()) as BlogFeed;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/blog",
    title: "בלוג Mendeles",
    description: "מאמרים שפורסמו מתוך אוטומציית AI SEO של Mendeles.",
  });
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", category = "" } = await searchParams;
  const feed = await fetchBlogFeed(locale, q, category);

  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">Mendeles Blog</p>
          <h1 className="mt-3 text-4xl font-bold">בלוג מאמרים</h1>
          <p className="mt-3 max-w-3xl text-slate-200">
            פיד ציבורי של מאמרים שפורסמו מהאוטומציה, עם קטגוריות, חיפוש ותאריכי פרסום.
          </p>
        </div>

        <form className="mt-8 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_220px_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="חיפוש מאמרים..."
            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
          <select
            name="category"
            defaultValue={category}
            className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          >
            <option value="">כל הקטגוריות</option>
            {feed.categories.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-cyan-300 px-6 py-3 font-bold text-slate-950">
            חפש
          </button>
        </form>

        {feed.results.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-300">
            אין עדיין מאמרים מפורסמים להצגה.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {feed.results.map((page) => {
              const image = firstImage(page);
              const categoryName = page.terms.find((term) => term.taxonomy === "ai-seo-categories")?.name;
              return (
                <article key={page.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] text-white">
                  {image && textValue(image.url) && (
                    <img src={textValue(image.url)} alt={textValue(image.alt) || page.title} className="h-48 w-full object-cover" />
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {categoryName && <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-cyan-200">{categoryName}</span>}
                      <span>{page.published_at ? new Date(page.published_at).toLocaleString("he-IL") : "ללא תאריך"}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-bold">{page.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{page.meta_description}</p>
                    <Link href={page.full_path} className="mt-5 inline-flex rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">
                      קרא מאמר
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </MarketingShell>
  );
}
