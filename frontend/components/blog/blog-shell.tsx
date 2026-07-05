import type { ReactNode } from "react";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogLightFooter } from "@/components/blog/blog-light-footer";

type Props = {
  children: ReactNode;
};

export function BlogShell({ children }: Props) {
  return (
    <div className="blog-light min-h-screen bg-[#f8f9fa] text-slate-900">
      <BlogHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <BlogLightFooter />
    </div>
  );
}
