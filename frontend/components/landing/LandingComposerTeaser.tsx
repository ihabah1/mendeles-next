"use client";

import DocumentComposer from "@/components/documents/DocumentComposer";

/** Full composer on homepage — guests and members */
export default function LandingComposerTeaser() {
  return (
    <section className="landing-composer-section" id="create">
      <DocumentComposer compact />
    </section>
  );
}
