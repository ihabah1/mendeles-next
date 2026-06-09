"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { walletService } from "@/lib/api/wallet";
import PageCodeBadge from "@/components/PageCodeBadge";
import BalancePill from "@/components/BalancePill";
import PromoTopBanner from "@/components/promo/PromoTopBanner";
import MandelesLogoMark from "@/components/promo/MandelesLogoMark";

export default function Nav() {
  const router = useRouter();
  const path = usePathname();
  const { user: authUser, isAuthenticated, isStaff, logout: authLogout } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const isDemo = authUser?.email === "demo@mandeles.co.il";

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

  /** Toto hidden by default; set NEXT_PUBLIC_LOTTO_ONLY=false to show it. 777 always visible. */
  const hideToto = process.env.NEXT_PUBLIC_LOTTO_ONLY !== "false";
  const navLinks = [
    { href: "/lotto", label: "🎱 לוטו" },
    { href: "/seven77", label: "777" },
    ...(hideToto ? [] : [{ href: "/toto", label: "⚽ טוטו" }]),
    { href: "/profile", label: "👤 פרופיל" },
  ];

  const isActive = (href: string) => path === href || path?.startsWith(href + "/");
  const hidePromo = path?.startsWith("/admin") || path?.startsWith("/auth");

  return (
    <>
      {!hidePromo && <PromoTopBanner />}
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <MandelesLogoMark size="sm" />
          <PageCodeBadge />
        </Link>

        <div className="nav-links">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${isActive(l.href) ? " active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className={`nav-link${isActive("/admin") ? " active" : ""}`}
            >
              ⚙️ ניהול
            </Link>
          )}
        </div>

        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              {isDemo && <span className="nav-demo">🧪 DEMO</span>}
              {balance !== null ? (
                <BalancePill balance={balance} compact />
              ) : (
                <span className="nav-balance">💳 ...</span>
              )}
              <button
                type="button"
                onClick={logout}
                className="btn btn-outline btn-sm"
              >
                התנתק
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
    </>
  );
}
