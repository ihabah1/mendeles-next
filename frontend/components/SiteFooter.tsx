"use client";

import { usePathname } from "next/navigation";

const LIGHT_FOOTER_PATHS = ["/", "/dashboard", "/pricing", "/about", "/terms"];

export default function SiteFooter() {
  const path = usePathname() ?? "";
  const light =
    LIGHT_FOOTER_PATHS.includes(path) ||
    path.startsWith("/dashboard/");

  if (light) {
    return (
      <footer className="site-footer site-footer--light">
        <div className="site-footer-links">
          <a href="/about">אודות</a>
          <a href="/terms">תנאי שימוש</a>
          <a href="/accessibility">נגישות</a>
          <a href="/pricing">מחירים</a>
        </div>
        <p className="site-footer-copy">
          © 2026 Mandeles.co.il — מסמכים חכמים, חתימה דיגיטלית ו-AI לעסקים בישראל
        </p>
      </footer>
    );
  }

  return (
    <footer className="site-footer site-footer--dark">
      <div className="site-footer-links">
        <a href="/about">אודות</a>
        <a href="/terms">תנאי שימוש</a>
        <a href="/accessibility">נגישות</a>
      </div>
      <p className="site-footer-copy">
        © 2026 Mandeles.co.il — איננו קשורים למפעל הפיס | גיל מינימלי 18 | בעיות הימורים:{" "}
        <a href="tel:1800232425">1-800-23-24-25</a>
      </p>
    </footer>
  );
}
