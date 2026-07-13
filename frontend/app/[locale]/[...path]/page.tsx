import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BlogShell } from "@/components/blog/blog-shell";
import { PublicArticleImage } from "@/components/blog/public-article-image";
import { ContactCtaButton } from "@/components/leads/contact-cta-button";
import { PublicContactFormBlock } from "@/components/leads/public-contact-form-block";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { defaultNavCategories, localizeBlogCategories } from "@/lib/blog/category-labels";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import { resolvePublicImageUrl } from "@/lib/blog/public-image";
import { backendBase } from "@/lib/api/backend-url";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { BlogCategory } from "@/lib/blog/types";

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

function shouldOpenContactForm(href: string): boolean {
  const normalized = href.trim().toLowerCase();
  if (!normalized || normalized === "#") return true;
  if (normalized === "#contact" || normalized === "#faq") return true;
  // Relative in-page anchors from generated content → contact modal
  if (normalized.startsWith("#")) return true;
  return false;
}

function resolveContactFormId(blocks: PublicContentBlock[]): string {
  for (const block of blocks) {
    if (!block.is_visible) continue;
    if (block.block_type !== "contact_form" && block.block_type !== "form") continue;
    const id = textValue(block.config.formId);
    if (id) return id;
  }
  return "";
}

async function fetchBlogCategories(locale: string): Promise<BlogCategory[]> {
  const url = new URL("/api/v1/content/public/pages/", backendBase());
  url.searchParams.set("page_type", "blog");
  url.searchParams.set("locale", locale);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return defaultNavCategories(locale);
  const data = (await res.json()) as { categories?: Array<{ slug: string; name: string }> };
  const categories = data.categories || [];
  if (!categories.length) return defaultNavCategories(locale);
  return localizeBlogCategories(
    categories.map((item) => ({ ...item, count: 0 })),
    locale,
  );
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
  contactFormId,
  pageId,
  pageUrl,
  isBlog = false,
}: {
  config: Record<string, unknown>;
  contactFormId: string;
  pageId: string;
  pageUrl: string;
  isBlog?: boolean;
}) {
  const theme = config.theme && typeof config.theme === "object" ? (config.theme as Record<string, unknown>) : {};
  const accent = textValue(theme.accent) || "cyan";
  const cta = textValue(config.cta);
  const href = blockHref(config, "#contact");
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
      {cta ? (
        shouldOpenContactForm(href) ? (
          <ContactCtaButton
            label={cta}
            formId={contactFormId}
            pageId={pageId}
            pageUrl={pageUrl}
            variant="cyan"
            className="mt-8"
          />
        ) : (
          <a
            href={href}
            className="mt-8 inline-flex rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            {cta}
          </a>
        )
      ) : null}
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

function FaqBlock({
  config,
  locale,
  isBlog = false,
}: {
  config: Record<string, unknown>;
  locale: string;
  isBlog?: boolean;
}) {
  const items = Array.isArray(config.items) ? config.items : [];
  if (!items.length) return null;
  const copy = editorialCopy(locale);
  return (
    <section
      id="faq"
      className={
        isBlog
          ? "scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          : "scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
      }
    >
      <h2 className={`text-2xl font-bold ${isBlog ? "text-slate-900" : "text-white"}`}>{copy.faq}</h2>
      <div className="mt-6 space-y-4">
        {items.map((item, index) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return (
            <details
              key={index}
              className={
                isBlog
                  ? "rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  : "rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              }
            >
              <summary
                className={`cursor-pointer font-semibold ${isBlog ? "text-slate-900" : "text-white"}`}
              >
                {textValue(row.question)}
              </summary>
              <p className={`mt-3 leading-7 ${isBlog ? "text-slate-600" : "text-slate-300"}`}>
                {textValue(row.answer)}
              </p>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function CtaBlock({
  config,
  locale,
  contactFormId,
  pageId,
  pageUrl,
}: {
  config: Record<string, unknown>;
  locale: string;
  contactFormId: string;
  pageId: string;
  pageUrl: string;
}) {
  const copy = editorialCopy(locale);
  const button = textValue(config.button) || textValue(config.cta);
  const headline = textValue(config.headline) || textValue(config.title);
  const href = blockHref(config, "#contact");
  const linkLabel = button || copy.learnMore;

  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-cyan-300 to-blue-500 p-8 text-center text-slate-950">
      <h2 className="text-3xl font-bold">{headline}</h2>
      {(textValue(config.text) || textValue(config.description)) && (
        <p className="mx-auto mt-3 max-w-2xl text-base font-medium">
          {textValue(config.text) || textValue(config.description)}
        </p>
      )}
      {(button || headline) &&
        (shouldOpenContactForm(href) ? (
          <ContactCtaButton
            label={linkLabel}
            formId={contactFormId}
            pageId={pageId}
            pageUrl={pageUrl}
            variant="dark"
          />
        ) : (
          <a
            href={href}
            className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {linkLabel}
          </a>
        ))}
    </section>
  );
}

function PublicBlock({
  block,
  page,
  locale,
  contactFormId,
}: {
  block: PublicContentBlock;
  page: PublicContentPage;
  locale: string;
  contactFormId: string;
}) {
  if (!block.is_visible) return null;

  const isBlog = page.page_type === "blog";

  if (block.block_type === "image") return <ImageBlock config={block.config} />;
  if (block.block_type === "source_link") return <SourceLinkBlock config={block.config} locale={locale} />;
  if (block.block_type === "hero") {
    return (
      <HeroBlock
        config={block.config}
        contactFormId={contactFormId}
        pageId={page.id}
        pageUrl={page.full_path}
        isBlog={isBlog}
      />
    );
  }
  if (block.block_type === "faq") return <FaqBlock config={block.config} locale={locale} isBlog={isBlog} />;
  if (block.block_type === "cta") {
    return (
      <CtaBlock
        config={block.config}
        locale={locale}
        contactFormId={contactFormId}
        pageId={page.id}
        pageUrl={page.full_path}
      />
    );
  }
  if (block.block_type === "contact_form" || block.block_type === "form") {
    const formId = textValue(block.config.formId) || contactFormId;
    if (!formId) return null;
    return (
      <PublicContactFormBlock
        formId={formId}
        pageId={page.id}
        pageUrl={page.full_path}
        headline={textValue(block.config.headline) || editorialCopy(locale).contact}
        anchorId={textValue(block.config.anchorId) || "contact"}
        light={isBlog}
      />
    );
  }
  return <RichTextBlock config={block.config} isBlog={isBlog} />;
}

function BlogArticleLayout({
  page,
  locale,
  visibleBlocks,
  contactFormId,
}: {
  page: PublicContentPage;
  locale: string;
  visibleBlocks: PublicContentBlock[];
  contactFormId: string;
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
          <PublicBlock
            key={block.id}
            block={block}
            page={page}
            locale={locale}
            contactFormId={contactFormId}
          />
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
  const contactFormId = resolveContactFormId(visibleBlocks);

  if (isBlog) {
    const categories = await fetchBlogCategories(locale);
    return (
      <BlogShell categories={categories} locale={locale}>
        <BlogArticleLayout
          page={page}
          locale={locale}
          visibleBlocks={visibleBlocks}
          contactFormId={contactFormId}
        />
      </BlogShell>
    );
  }

  return (
    <MarketingShell>
      <article className="mx-auto max-w-5xl space-y-8 px-6 py-16">
        {visibleBlocks.length ? (
          visibleBlocks.map((block) => (
            <PublicBlock
              key={block.id}
              block={block}
              page={page}
              locale={locale}
              contactFormId={contactFormId}
            />
          ))
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
