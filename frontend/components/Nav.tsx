"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { walletService } from "@/lib/api/wallet";
import PageCodeBadge from "@/components/PageCodeBadge";
import BalancePill from "@/components/BalancePill";
import PromoTopBanner from "@/components/promo/PromoTopBanner";
import MandelesLogoMark from "@/components/promo/MandelesLogoMark";

type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: string;
};

type SearchTarget = {
  href: string;
  label: string;
  subtitle: string;
  code: string;
};

const SEARCH_TARGETS: SearchTarget[] = [
  { href: "/", label: "דף ראשי", subtitle: "HO47", code: "HO47" },
  { href: "/lotto", label: "לוטו", subtitle: "בסיס המשחק המרכזי", code: "LT83" },
  { href: "/seven77", label: "777", subtitle: "משחק מזל מהיר", code: "S777" },
  { href: "/toto", label: "טוטו", subtitle: "ניתוח סטטיסטי", code: "TT29" },
  { href: "/promotions", label: "מבצעים", subtitle: "הטבות ומתנות", code: "PM33" },
  { href: "/about", label: "אודות", subtitle: "למה אנחנו", code: "AB16" },
  { href: "/terms", label: "תנאי שימוש", subtitle: "מידע משפטי", code: "TE52" },
  { href: "/auth", label: "כניסה / הרשמה", subtitle: "התחברות לאתר", code: "AU91" },
  { href: "/profile", label: "פרופיל", subtitle: "ניהול חשבון", code: "PR64" },
  { href: "/profile/details", label: "פרטים אישיים", subtitle: "עדכון פרטי משתמש", code: "PD81" },
  { href: "/profile/password", label: "שינוי סיסמה", subtitle: "ניהול אבטחה", code: "PW62" },
  { href: "/topup", label: "טעינת ארנק", subtitle: "הוסף קרדיט לחשבון", code: "TU77" },
  { href: "/profile/orders", label: "תוצאות", subtitle: "היסטוריית הזמנות", code: "OR71" },
  { href: "/profile/forms", label: "היסטוריית רכישות", subtitle: "טפסים וקבלות", code: "OR71" },
  { href: "/accessibility", label: "נגישות", subtitle: "תמיכה למשתמשים", code: "AC12" },
  { href: "/auth/verify-email", label: "אימות אימייל", subtitle: 'אימות כתובת דוא"ל', code: "AV52" },
  { href: "/auth/oauth", label: "OAuth", subtitle: "כניסה חיצונית", code: "AO38" },
  { href: "/hot-numbers", label: "Hot Numbers היסטוריים", subtitle: "סטטיסטיקת מספרים חמים", code: "HN01" },
];

export default function Nav() {
  const router = useRouter();
  const path = usePathname();
  const { user: authUser, isAuthenticated, isStaff, logout: authLogout } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return SEARCH_TARGETS;
    // Autocomplete ranking: label prefix matches first, then any match.
    const starts: SearchTarget[] = [];
    const contains: SearchTarget[] = [];
    for (const target of SEARCH_TARGETS) {
      const label = target.label.toLowerCase();
      const normalized = `${target.label} ${target.subtitle} ${target.code} ${target.href}`.toLowerCase();
      if (label.startsWith(query)) starts.push(target);
      else if (normalized.includes(query)) contains.push(target);
    }
    return [...starts, ...contains];
  }, [searchQuery]);

  /** Inline autocomplete hint — rest of the first label that starts with the query. */
  const completionHint = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return "";
    const first = searchResults[0];
    if (first && first.label.toLowerCase().startsWith(query.toLowerCase()) && first.label.length > query.length) {
      return first.label.slice(query.length);
    }
    return "";
  }, [searchQuery, searchResults]);

  const isDemo = authUser?.email === "demo@mandeles.co.il";
  const isHome = path === "/";

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [path]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  const handleSearchSelect = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = searchResults[activeIndex] ?? searchResults[0];
    if (target) {
      handleSearchSelect(target.href);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if ((event.key === "Tab" || event.key === "ArrowLeft") && completionHint) {
      event.preventDefault();
      setSearchQuery(searchQuery + completionHint);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setBalance(null);
      return;
    }
    walletService
      .balance()
      .then((w) => setBalance(w.balance))
      .catch(() => setBalance(null));
  }, [isAuthenticated, path]);

  const logout = async () => {
    await authLogout().catch(() => {});
    localStorage.removeItem("demo_mode");
    document.cookie = "demo_mode=; path=/; max-age=0";
    router.push("/");
  };

  const hideToto = process.env.NEXT_PUBLIC_LOTTO_ONLY !== "false";
  const navLinks: NavLink[] = [
    { href: "/", label: "ראשי", exact: true },
    { href: "/lotto", label: "לוטו" },
    { href: "/seven77", label: "777" },
    ...(hideToto ? [] : [{ href: "/toto", label: "טוטו" }]),
    { href: "/about", label: "מידע" },
    { href: "/promotions", label: "מבצעים", badge: "3" },
    { href: "/profile/orders", label: "תוצאות" },
    { href: "/terms", label: "משחקים באחריות" },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path === href || (path?.startsWith(href + "/") ?? false);

  const hidePromo = path?.startsWith("/admin") || path?.startsWith("/auth");

  return (
    <>
      {!hidePromo && !isHome && <PromoTopBanner />}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <MandelesLogoMark size="sm" />
            <PageCodeBadge />
          </Link>

          <div className="nav-links">
            {navLinks.map((l) => (
              <Link
                key={`${l.href}-${l.label}`}
                href={l.href}
                className={`nav-link${isActive(l.href, l.exact) ? " active" : ""}`}
              >
                {l.label}
                {l.badge ? <span className="nav-link-badge">{l.badge}</span> : null}
              </Link>
            ))}
            {isStaff && (
              <Link
                href="/admin"
                className={`nav-link${isActive("/admin") ? " active" : ""}`}
              >
                נהל
              </Link>
            )}
          </div>

          <div className="nav-actions">
            {isAuthenticated && (
              <button type="button" className="nav-search" onClick={() => setSearchOpen(true)}>
                🔍 חיפוש
              </button>
            )}
            {isAuthenticated ? (
              <>
                {isDemo && <span className="nav-demo">DEMO</span>}
                {balance !== null ? (
                  <BalancePill balance={balance} compact />
                ) : (
                  <span className="nav-balance">...</span>
                )}
                <button type="button" onClick={logout} className="nav-logout-btn">
                  התנתק
                </button>
              </>
            ) : (
              <Link href="/auth" className="nav-login-btn">
                👤 כניסה / הרשמה
              </Link>
            )}
          </div>
        </div>
      </nav>
      {searchOpen && isAuthenticated && (
        <div className="search-backdrop" role="dialog" aria-modal="true" onClick={() => setSearchOpen(false)}>
          <div className="search-dialog" onClick={(event) => event.stopPropagation()}>
            <form className="search-form" onSubmit={handleSearchSubmit}>
              <label htmlFor="nav-search-input" className="sr-only">
                חיפוש דפים
              </label>
              <div className="search-input-wrap">
                {completionHint && (
                  <span className="search-completion" aria-hidden>
                    <span className="search-completion-typed">{searchQuery}</span>
                    <span className="search-completion-rest">{completionHint}</span>
                  </span>
                )}
                <input
                  id="nav-search-input"
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="search-input"
                  placeholder="הקלד מילת חיפוש"
                  aria-label="חפש דף"
                  autoComplete="off"
                />
              </div>
            </form>
            <div className="search-list">
              {searchResults.length ? (
                searchResults.map((target, idx) => (
                  <button
                    key={target.href}
                    type="button"
                    className={`search-item${idx === activeIndex ? " active" : ""}`}
                    onClick={() => handleSearchSelect(target.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span>
                      <span>{target.label}</span>
                      <div className="search-item-subtitle">{target.subtitle}</div>
                    </span>
                    <span className="search-item-code">{target.code}</span>
                  </button>
                ))
              ) : (
                <div className="search-empty">לא נמצאו תוצאות</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
