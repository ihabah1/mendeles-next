import type { ReactNode } from "react";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogFooter } from "@/components/blog/footer";
import type { BlogCategory } from "@/lib/blog/types";

type Props = {
  children: ReactNode;
  categories: BlogCategory[];
};

export function BlogShell({ children, categories }: Props) {
  return (
    <div className="blog-editorial min-h-screen bg-[#F7F8FC] text-slate-900">
      <BlogHeader categories={categories} />
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <BlogFooter />
    </div>
  );
}
