import { Link } from "@/lib/i18n/navigation";

const NAV_ITEMS = [
  { href: "/company", label: "אודות" },
  { href: "/solutions", label: "כלים" },
  { href: "/industries", label: "משאבים" },
  { href: "/blog", label: "קטגוריות", hasDropdown: true },
  { href: "/blog", label: "מדריכים", hasDropdown: true },
] as const;

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="#blog-search" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#5e35b1]" aria-label="חיפוש">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          <Link
            href="/blog#newsletter"
            className="hidden rounded-lg bg-[#5e35b1] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a2a9c] sm:inline-flex"
          >
            הרשמה לניוזלטר
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex" aria-label="ניווט בלוג">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} className="inline-flex items-center gap-1 transition hover:text-[#5e35b1]">
              {item.label}
              {"hasDropdown" in item && item.hasDropdown ? (
                <span className="text-[10px] opacity-50" aria-hidden="true">
                  ▾
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <Link href="/blog" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#5e35b1] to-[#7c4dff] text-sm font-bold text-white shadow-md">
            M
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Mendeles <span className="font-semibold text-[#5e35b1]">INSIGHTS</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
