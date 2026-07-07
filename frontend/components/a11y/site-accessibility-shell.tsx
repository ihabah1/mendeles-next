"use client";

import { AccessibilityWidget } from "@/components/a11y/accessibility-widget";
import { SkipToContent } from "@/components/a11y/skip-to-content";

/** Global accessibility UI — skip link + floating widget on every locale page. */
export function SiteAccessibilityShell() {
  return (
    <>
      <SkipToContent />
      <AccessibilityWidget />
    </>
  );
}
