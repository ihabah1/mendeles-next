import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { BlogShell } from "@/components/blog/blog-shell";
import { ToolsMenu } from "@/components/tools/tools-menu";
import { defaultNavCategories } from "@/lib/blog/category-labels";
import { buildPageMetadata } from "@/lib/seo/metadata";
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
  });
}

export default async function ToolsHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = toolsCopy(locale);

  return (
    <BlogShell categories={defaultNavCategories(locale)} locale={locale}>
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
