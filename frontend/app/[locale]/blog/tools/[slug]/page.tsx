import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { BlogShell } from "@/components/blog/blog-shell";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ToolRenderer } from "@/components/tools/tool-renderer";
import { defaultNavCategories } from "@/lib/blog/category-labels";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { TOOL_SLUGS, isToolSlug } from "@/lib/tools/catalog";
import { toolsCopy } from "@/lib/tools/copy";

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
  return buildPageMetadata({
    locale,
    path: `/blog/tools/${slug}`,
    title: meta.title,
    description: meta.description,
  });
}

export default async function ToolPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!isToolSlug(slug)) notFound();

  const meta = toolsCopy(locale).tools[slug];

  return (
    <BlogShell categories={defaultNavCategories(locale)} locale={locale}>
      <ToolPageShell locale={locale} title={meta.title} description={meta.description}>
        <ToolRenderer slug={slug} locale={locale} />
      </ToolPageShell>
    </BlogShell>
  );
}
