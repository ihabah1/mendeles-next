"use client";

import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import { trackBlogRead } from "@/lib/blog/reads";

export function BlogReadLink({ href, postId, children, className }: { href: string; postId: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={className} onClick={() => trackBlogRead(postId)}>
      {children}
    </Link>
  );
}
