"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageCodeBadge from "@/components/PageCodeBadge";
import MandelesLogoMark from "@/components/promo/MandelesLogoMark";

const LINKS = [
  { href: "/", label: "ראשי", exact: true },
  { href: "/#features", label: "תכונות" },
  { href: "/pricing", label: "מחירים" },
  { href: "/dashboard", label: "מסמכים" },
] as const;

export default function LandingNav() {
  const path = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (href === "/#features") return false;
    if (exact) return path === href;
    return path === href || (path?.startsWith(href + "/") ?? false);
  };

  return (
    <header className="landing-nav">
      <div className="landing-nav-inner">
        <Link href="/" className="landing-nav-logo">
          <MandelesLogoMark size="sm" variant="club" theme="light" accent="gray" />
          <PageCodeBadge />
        </Link>

        <nav className="landing-nav-links" aria-label="ניווט ראשי">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`landing-nav-link${isActive(l.href, "exact" in l ? l.exact : false) ? " landing-nav-link--active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="landing-nav-actions">
          <Link href="/auth" className="landing-nav-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            כניסה / הרשמה
          </Link>
        </div>
      </div>
    </header>
  );
}
