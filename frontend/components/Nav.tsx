"use client";
import { useEffect, useState } from "react";
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

export default function Nav() {
  const router = useRouter();
  const path = usePathname();
  const { user: authUser, isAuthenticated, isStaff, logout: authLogout } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const isDemo = authUser?.email === "demo@mandeles.co.il";
  const isHome = path === "/";

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
              <Link href="/search" className="nav-search">
                🔍 חיפוש
              </Link>
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
    </>
  );
}
