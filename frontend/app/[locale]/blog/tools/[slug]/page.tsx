import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BlogShell } from "@/components/blog/blog-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ToolRenderer } from "@/components/tools/tool-renderer";
import { ToolSeoContentSection } from "@/components/tools/tool-seo-content";
import { defaultNavCategories } from "@/lib/blog/category-labels";
import { localizePath } from "@/lib/seo/canonical";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { absoluteSiteUrl } from "@/lib/seo/site-url";
import { TOOL_SLUGS, isToolSlug } from "@/lib/tools/catalog";
import { toolsCopy } from "@/lib/tools/copy";
import { toolSeoContent } from "@/lib/tools/seo-content";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return TOOL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isToolSlug(slug)) return {};
  const meta = toolsCopy(locale).tools[slug];
  const seo = toolSeoContent(locale, slug, meta.title);
  return buildPageMetadata({
    locale,
    path: `/blog/tools/${slug}`,
    title: meta.title,
    description: meta.description,
    keywords: seo.keywords.join(", "),
  });
}

export default async function ToolPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!isToolSlug(slug)) notFound();

  const meta = toolsCopy(locale).tools[slug];
  const seo = toolSeoContent(locale, slug, meta.title);
  const path = localizePath(`/blog/tools/${slug}`, locale);
  const url = absoluteSiteUrl(path);
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: meta.title,
      description: meta.description,
      url,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and a modern web browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "ILS",
      },
      inLanguage: locale,
      featureList: seo.benefits,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seo.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Mendeles", item: absoluteSiteUrl(localizePath("/", locale)) },
        { "@type": "ListItem", position: 2, name: toolsCopy(locale).hubTitle, item: absoluteSiteUrl(localizePath("/blog/tools", locale)) },
        { "@type": "ListItem", position: 3, name: meta.title, item: url },
      ],
    },
  ];

  return (
    <BlogShell categories={defaultNavCategories(locale)} locale={locale}>
      <JsonLd data={schemas} />
      <ToolPageShell locale={locale} title={meta.title} description={meta.description}>
        <ToolRenderer slug={slug} locale={locale} />
        <ToolSeoContentSection locale={locale} slug={slug} content={seo} />
      </ToolPageShell>
    </BlogShell>
  );
}
