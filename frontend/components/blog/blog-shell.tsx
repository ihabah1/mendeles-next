import { Heebo } from "next/font/google";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ArticlePreviewDrawer } from "@/components/blog/article-preview-drawer";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogFooter } from "@/components/blog/footer";
import type { BlogCardPost, BlogCategory } from "@/lib/blog/types";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-blog",
  display: "swap",
});

type Props = {
  children: ReactNode;
  categories: BlogCategory[];
  previewPosts?: BlogCardPost[];
  locale?: string;
};

export function BlogShell({ children, categories, previewPosts = [], locale = "he" }: Props) {
  return (
    <div className={`${heebo.variable} blog-editorial min-h-screen bg-[#FDF2F9] font-[family-name:var(--font-blog)] text-slate-900`}>
      <BlogHeader categories={categories} locale={locale} />
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <BlogFooter />
      <Suspense fallback={null}>
        <ArticlePreviewDrawer posts={previewPosts} locale={locale} />
      </Suspense>
    </div>
  );
}
