import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BlogShell } from "@/components/blog/blog-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { ToolsMenu } from "@/components/tools/tools-menu";
import { defaultNavCategories } from "@/lib/blog/category-labels";
import { localizePath } from "@/lib/seo/canonical";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { absoluteSiteUrl } from "@/lib/seo/site-url";
import { TOOLS } from "@/lib/tools/catalog";
import { toolsCopy } from "@/lib/tools/copy";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const copy = toolsCopy(locale);
  return buildPageMetadata({
    locale,
    path: "/blog/tools",
    title: copy.hubTitle,
    description: copy.hubSubtitle,
    keywords:
      locale === "he"
        ? "כלים שימושיים, כלים חינמיים, מחשבונים אונליין, כלי PDF, מחולל QR, מחשבון משכנתא, מחשבון שכר"
        : "free online tools, useful calculators, PDF tools, QR generator, mortgage calculator, salary calculator",
  });
}

export default async function ToolsHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = toolsCopy(locale);
  const hubUrl = absoluteSiteUrl(localizePath("/blog/tools", locale));

  return (
    <BlogShell categories={defaultNavCategories(locale)} locale={locale}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: copy.hubTitle,
          description: copy.hubSubtitle,
          url: hubUrl,
          inLanguage: locale,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: TOOLS.map((tool, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: copy.tools[tool.slug].title,
              url: absoluteSiteUrl(localizePath(`/blog/tools/${tool.slug}`, locale)),
            })),
          },
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{copy.hubTitle}</h1>
          <p className="mt-3 text-base text-slate-600">{copy.hubSubtitle}</p>
        </header>
        <ToolsMenu locale={locale} />
      </div>
    </BlogShell>
  );
}
