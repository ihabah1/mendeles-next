"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { walletService } from "@/lib/api/wallet";

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

  const navLinks = [
    { href: "/lotto", label: "🎱 לוטו" },
    { href: "/toto", label: "⚽ טוטו" },
    { href: "/profile", label: "👤 פרופיל" },
  ];

  const isActive = (href: string) => path === href || path?.startsWith(href + "/");

  const linkStyle = (href: string) => ({
    color: isActive(href) ? "var(--gold)" : "var(--muted)",
    textDecoration: "none",
    padding: "5px 10px",
    borderRadius: 7,
    fontSize: ".78rem",
    background: isActive(href) ? "rgba(201,168,76,.08)" : "none",
    transition: "all .15s",
  });

  return (
    <nav style={{ background: "var(--navy-m)", borderBottom: "1px solid var(--navy-b)", position: "sticky", top: 0, zIndex: 200 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 52 }}>
        <Link href="/" style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1rem", color: "var(--gold)", fontWeight: 700, textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          🎯 Mandeles<span style={{ color: "var(--muted)", fontSize: ".7rem", fontFamily: "Heebo,sans-serif", fontWeight: 400 }}>.co.il</span>
        </Link>

        <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center" }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={linkStyle(l.href)}>{l.label}</Link>
          ))}
          {isStaff && (
            <Link href="/admin" style={linkStyle("/admin")}>⚙️ ניהול</Link>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isAuthenticated ? (
            <>
              {isDemo && <span style={{ background: "rgba(232,160,48,.12)", border: "1px solid rgba(232,160,48,.3)", color: "#e8c870", borderRadius: 5, fontSize: ".65rem", fontWeight: 700, padding: "3px 8px" }}>🧪 DEMO</span>}
              <Link href="/profile" style={{ background: "rgba(201,168,76,.12)", border: "1px solid #9a7a30", borderRadius: 6, padding: "4px 9px", fontSize: ".72rem", fontWeight: 700, color: "var(--gold)", textDecoration: "none" }}>
                💳 ₪{balance?.toFixed(2) ?? "..."}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn btn-outline"
                style={{ fontSize: ".72rem", padding: "5px 10px", whiteSpace: "nowrap" }}
              >
                התנתק
              </button>
            </>
          ) : (
            <Link href="/auth" style={{ background: "linear-gradient(135deg,var(--gold),var(--gold-l))", color: "var(--navy)", border: "none", borderRadius: 8, fontFamily: "Heebo,sans-serif", fontSize: ".76rem", fontWeight: 800, padding: "6px 12px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>כניסה / הרשמה</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
