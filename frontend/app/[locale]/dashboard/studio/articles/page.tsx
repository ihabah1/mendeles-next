"use client";

import { Suspense } from "react";
import { ContentStudioHub } from "@/components/studio/content-studio-hub";

export default function ArticleStudioPage() {
  return (
    <Suspense fallback={null}>
      <ContentStudioHub kind="blog" />
    </Suspense>
  );
}
