import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PublicArticleImage } from "@/components/blog/public-article-image";
import { PublicContactFormBlock } from "@/components/leads/public-contact-form-block";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import { resolvePublicImageUrl } from "@/lib/blog/public-image";
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

function blockHref(config: Record<string, unknown>, fallback: string): string {
  return textValue(config.cta_href) || textValue(config.button_href) || fallback;
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
    title: page.page_type === "blog" ? page.title : page.meta_title || page.title,
    description: page.meta_description || page.title,
    path: page.full_path,
  });
}

function HeroBlock({
  config,
  isLandingPage,
  isBlog = false,
}: {
  config: Record<string, unknown>;
  isLandingPage: boolean;
  isBlog?: boolean;
}) {
  const theme = config.theme && typeof config.theme === "object" ? (config.theme as Record<string, unknown>) : {};
  const accent = textValue(theme.accent) || "cyan";
  const cta = textValue(config.cta);
  const href = isLandingPage ? blockHref(config, "#contact") : "";
  const HeadingTag = isBlog ? "h2" : "h1";

  return (
    <section className={`rounded-[2rem] border px-6 py-14 text-center shadow-2xl sm:px-10 ${accentClasses(accent)}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">Mendeles AI</p>
      <HeadingTag className="mt-5 text-3xl font-bold text-white sm:text-5xl">
        {textValue(config.headline) || textValue(config.title)}
      </HeadingTag>
      <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-200">
        {textValue(config.subheadline) || textValue(config.description)}
      </p>
      {cta &&
        (href ? (
          <a
            href={href}
            className="mt-8 inline-flex rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            {cta}
          </a>
        ) : (
          <span className="mt-8 inline-flex rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950">{cta}</span>
        ))}
    </section>
  );
}

function ImageBlock({ config }: { config: Record<string, unknown> }) {
  const url = textValue(config.url);
  if (!url) return null;
  const matchedDomain = textValue(config.matched_domain);
  const resolvedUrl = resolvePublicImageUrl(url, { matched_domain: matchedDomain, seed: url });
  return (
    <PublicArticleImage
      src={resolvedUrl}
      alt={textValue(config.alt) || "Public page image"}
      caption={textValue(config.license) || textValue(config.caption) || "Free stock image"}
      matchedDomain={matchedDomain}
    />
  );
}

function SourceLinkBlock({ config, locale }: { config: Record<string, unknown>; locale: string }) {
  const url = textValue(config.url);
  const label = textValue(config.label) || textValue(config.source_name);
  if (!url) return null;
  const copy = editorialCopy(locale);
  const text = label ? `${copy.sourceLink}: ${label}` : copy.sourceLink;
  return (
    <p className="border-t border-slate-200 pt-6 text-sm text-slate-500">
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#6F42F5] underline">
        {text}
      </a>
    </p>
  );
}

function RichTextBlock({ config, isBlog }: { config: Record<string, unknown>; isBlog: boolean }) {
  const content = stripHtml(config.html || config.body || config.text);
  if (!content) return null;
  return (
    <section
      className={
        isBlog
          ? "border-s border-slate-900/10 py-2 ps-5"
          : "rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
      }
    >
      <p
        className={
          isBlog
            ? "whitespace-pre-line text-lg leading-9 text-slate-800"
            : "whitespace-pre-line text-lg leading-9 text-slate-200"
        }
      >
        {content}
      </p>
    </section>
  );
}

function FaqBlock({ config, locale }: { config: Record<string, unknown>; locale: string }) {
  const items = Array.isArray(config.items) ? config.items : [];
  if (!items.length) return null;
  const copy = editorialCopy(locale);
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-white">{copy.faq}</h2>
      <div className="mt-6 space-y-4">
        {items.map((item, index) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return (
            <details key={index} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <summary className="cursor-pointer font-semibold text-white">{textValue(row.question)}</summary>
              <p className="mt-3 leading-7 text-slate-300">{textValue(row.answer)}</p>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function CtaBlock({
  config,
  isLandingPage,
}: {
  config: Record<string, unknown>;
  isLandingPage: boolean;
}) {
  const button = textValue(config.button);
  const href = isLandingPage ? blockHref(config, "#contact") : "";
  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-cyan-300 to-blue-500 p-8 text-center text-slate-950">
      <h2 className="text-3xl font-bold">{textValue(config.headline) || textValue(config.title)}</h2>
      {(textValue(config.text) || textValue(config.description)) && (
        <p className="mx-auto mt-3 max-w-2xl text-base font-medium">
          {textValue(config.text) || textValue(config.description)}
        </p>
      )}
      {button &&
        (href ? (
          <a
            href={href}
            className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {button}
          </a>
        ) : (
          <span className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white">{button}</span>
        ))}
    </section>
  );
}

function PublicBlock({
  block,
  page,
  locale,
}: {
  block: PublicContentBlock;
  page: PublicContentPage;
  locale: string;
}) {
  if (!block.is_visible) return null;

  const isLandingPage = page.page_type === "landing_page";
  const isBlog = page.page_type === "blog";

  if (block.block_type === "image") return <ImageBlock config={block.config} />;
  if (block.block_type === "source_link") return <SourceLinkBlock config={block.config} locale={locale} />;
  if (block.block_type === "hero") return <HeroBlock config={block.config} isLandingPage={isLandingPage} isBlog={isBlog} />;
  if (block.block_type === "faq") return <FaqBlock config={block.config} locale={locale} />;
  if (block.block_type === "cta") return <CtaBlock config={block.config} isLandingPage={isLandingPage} />;
  if (block.block_type === "contact_form" || block.block_type === "form") {
    const formId = textValue(block.config.formId);
    if (!formId) return null;
    return (
      <PublicContactFormBlock
        formId={formId}
        pageId={page.id}
        pageUrl={page.full_path}
        headline={textValue(block.config.headline) || editorialCopy(locale).contact}
        anchorId={textValue(block.config.anchorId) || "contact"}
      />
    );
  }
  return <RichTextBlock config={block.config} isBlog={isBlog} />;
}

function BlogArticleLayout({
  page,
  locale,
  visibleBlocks,
}: {
  page: PublicContentPage;
  locale: string;
  visibleBlocks: PublicContentBlock[];
}) {
  const copy = editorialCopy(locale);
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="border-b-4 border-[#6F42F5] pb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6F42F5]">{copy.breaking}</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          {page.title}
        </h1>
        {page.meta_description ? (
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">{page.meta_description}</p>
        ) : null}
      </header>
      <div className="mt-10 space-y-8">
        {visibleBlocks.map((block) => (
          <PublicBlock key={block.id} block={block} page={page} locale={locale} />
        ))}
      </div>
    </article>
  );
}

export default async function PublicContentPage({ params }: Props) {
  const { locale, path } = await params;
  setRequestLocale(locale);

  const page = await fetchPublicPage(locale, path);
  if (!page) notFound();

  const visibleBlocks = page.blocks.filter((block) => block.is_visible);
  const copy = editorialCopy(locale);
  const isBlog = page.page_type === "blog";

  if (isBlog) {
    return (
      <div className="min-h-screen bg-[#F4F5F8] text-slate-900">
        <BlogArticleLayout page={page} locale={locale} visibleBlocks={visibleBlocks} />
      </div>
    );
  }

  return (
    <MarketingShell>
      <article className="mx-auto max-w-5xl space-y-8 px-6 py-16">
        {visibleBlocks.length ? (
          visibleBlocks.map((block) => <PublicBlock key={block.id} block={block} page={page} locale={locale} />)
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <h1 className="text-3xl font-bold text-white">{page.title}</h1>
            <p className="mt-4 text-slate-300">{copy.emptyPage}</p>
          </section>
        )}
      </article>
    </MarketingShell>
  );
}
