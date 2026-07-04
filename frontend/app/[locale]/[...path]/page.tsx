import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { backendBase } from "@/lib/api/backend-url";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string; path: string[] }>;
};

type PublicContentBlock = {
  id: string;
  block_type: string;
  sort_order: number;
  config: Record<string, unknown>;
  is_visible: boolean;
};

type PublicContentPage = {
  id: string;
  title: string;
  full_path: string;
  locale: string;
  page_type: string;
  meta_title: string;
  meta_description: string;
  blocks: PublicContentBlock[];
};

async function fetchPublicPage(locale: string, path: string[]): Promise<PublicContentPage | null> {
  const fullPath = `/${path.join("/")}`;
  const url = new URL("/api/v1/content/public/pages/resolve/", backendBase());
  url.searchParams.set("path", fullPath);
  url.searchParams.set("locale", locale);

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load public content page (${res.status})`);
  return (await res.json()) as PublicContentPage;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stripHtml(value: unknown): string {
  return textValue(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function accentClasses(accent: string): string {
  if (accent === "emerald") return "border-emerald-400/20 bg-emerald-400/10 shadow-emerald-950/20";
  if (accent === "violet") return "border-violet-400/20 bg-violet-400/10 shadow-violet-950/20";
  if (accent === "amber") return "border-amber-400/20 bg-amber-400/10 shadow-amber-950/20";
  return "border-cyan-400/20 bg-cyan-400/10 shadow-cyan-950/20";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, path } = await params;
  const page = await fetchPublicPage(locale, path);
  if (!page) return {};

  return buildPageMetadata({
    locale,
    title: page.meta_title || page.title,
    description: page.meta_description || page.title,
    path: page.full_path,
  });
}

function HeroBlock({ config }: { config: Record<string, unknown> }) {
  const theme = config.theme && typeof config.theme === "object" ? (config.theme as Record<string, unknown>) : {};
  const accent = textValue(theme.accent) || "cyan";
  return (
    <section className={`rounded-[2rem] border px-6 py-14 text-center shadow-2xl sm:px-10 ${accentClasses(accent)}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">Mendeles AI</p>
      <h1 className="mt-5 text-3xl font-bold text-white sm:text-5xl">
        {textValue(config.headline) || textValue(config.title)}
      </h1>
      <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-200">
        {textValue(config.subheadline) || textValue(config.description)}
      </p>
      {textValue(config.cta) && (
        <span className="mt-8 inline-flex rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950">
          {textValue(config.cta)}
        </span>
      )}
    </section>
  );
}

function ImageBlock({ config }: { config: Record<string, unknown> }) {
  const url = textValue(config.url);
  if (!url) return null;
  return (
    <figure className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
      <img src={url} alt={textValue(config.alt) || "Public page image"} className="h-72 w-full object-cover sm:h-96" />
      <figcaption className="px-5 py-3 text-xs text-slate-400">
        {textValue(config.license) || "Free stock image"}
      </figcaption>
    </figure>
  );
}

function RichTextBlock({ config }: { config: Record<string, unknown> }) {
  const content = stripHtml(config.html || config.body || config.text);
  if (!content) return null;
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <p className="whitespace-pre-line text-lg leading-9 text-slate-200">{content}</p>
    </section>
  );
}

function FaqBlock({ config }: { config: Record<string, unknown> }) {
  const items = Array.isArray(config.items) ? config.items : [];
  if (!items.length) return null;
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-white">שאלות נפוצות</h2>
      <div className="mt-6 space-y-4">
        {items.map((item, index) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return (
            <details key={index} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <summary className="cursor-pointer font-semibold text-white">
                {textValue(row.question)}
              </summary>
              <p className="mt-3 leading-7 text-slate-300">{textValue(row.answer)}</p>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function CtaBlock({ config }: { config: Record<string, unknown> }) {
  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-cyan-300 to-blue-500 p-8 text-center text-slate-950">
      <h2 className="text-3xl font-bold">{textValue(config.headline) || textValue(config.title)}</h2>
      {(textValue(config.text) || textValue(config.description)) && (
        <p className="mx-auto mt-3 max-w-2xl text-base font-medium">
          {textValue(config.text) || textValue(config.description)}
        </p>
      )}
      {textValue(config.button) && (
        <span className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white">
          {textValue(config.button)}
        </span>
      )}
    </section>
  );
}

function PublicBlock({ block }: { block: PublicContentBlock }) {
  if (!block.is_visible) return null;

  if (block.block_type === "image") return <ImageBlock config={block.config} />;
  if (block.block_type === "hero") return <HeroBlock config={block.config} />;
  if (block.block_type === "faq") return <FaqBlock config={block.config} />;
  if (block.block_type === "cta") return <CtaBlock config={block.config} />;
  return <RichTextBlock config={block.config} />;
}

export default async function PublicContentPage({ params }: Props) {
  const { locale, path } = await params;
  setRequestLocale(locale);

  const page = await fetchPublicPage(locale, path);
  if (!page) notFound();

  const visibleBlocks = page.blocks.filter((block) => block.is_visible);

  return (
    <MarketingShell>
      <article className="mx-auto max-w-5xl space-y-8 px-6 py-16">
        {visibleBlocks.length ? (
          visibleBlocks.map((block) => <PublicBlock key={block.id} block={block} />)
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <h1 className="text-3xl font-bold text-white">{page.title}</h1>
            <p className="mt-4 text-slate-300">הדף פורסם, אך עדיין אין בו בלוקים להצגה.</p>
          </section>
        )}
      </article>
    </MarketingShell>
  );
}
