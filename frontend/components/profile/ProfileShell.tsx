"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import BalancePill from "@/components/BalancePill";
import { useAuth } from "@/lib/auth/AuthContext";
import { inboxService } from "@/lib/api/inbox";
import { walletService } from "@/lib/api/wallet";
import { PROFILE_TABS, tabFromPath } from "./profile-tabs";

export default function ProfileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: authLogout } = useAuth();
  const [balance, setBalance] = useState(0);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const active = tabFromPath(pathname);

  const refreshUnread = () => {
    if (localStorage.getItem("demo_mode") === "1") {
      setUnreadInbox(1);
      return;
    }
    inboxService
      .unreadCount()
      .then(setUnreadInbox)
      .catch(() => setUnreadInbox(0));
  };

  useEffect(() => {
    walletService
      .balance()
      .then((w) => setBalance(w.balance))
      .catch(() => setBalance(0));
    refreshUnread();
  }, [pathname]);

  useEffect(() => {
    const onUnreadChange = (e: Event) => {
      const count = (e as CustomEvent<number>).detail;
      if (typeof count === "number") setUnreadInbox(count);
      else refreshUnread();
    };
    window.addEventListener("inbox-unread-changed", onUnreadChange);
    return () => window.removeEventListener("inbox-unread-changed", onUnreadChange);
  }, []);

  const handleLogout = async () => {
    await authLogout().catch(() => {});
    localStorage.removeItem("demo_mode");
    router.push("/");
  };

  const displayName = user?.display_name || user?.full_name || user?.email || "משתמש";

  return (
    <>
      <Nav />
      <div className="profile-page">
        <div className="profile-header card">
          <div className="profile-header-main">
            <div>
              <h1 className="profile-title">👤 האזור האישי</h1>
              <div className="profile-sub">{displayName}</div>
              <div className="profile-email">{user?.email || user?.phone}</div>
            </div>
            <BalancePill balance={balance} name={displayName} />
          </div>
          <div className="profile-header-actions">
            <Link href="/lotto" className="btn btn-gold btn-sm">
              🎱 מלא טפסים
            </Link>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
              התנתק
            </button>
          </div>
        </div>

        <nav className="profile-tabs" aria-label="תפריט פרופיל">
          {PROFILE_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`profile-tab${active === tab.id ? " active" : ""}`}
            >
              <span className="profile-tab-icon">{tab.icon}</span>
              <span className="profile-tab-label">
                {tab.label}
                {tab.id === "inbox" && unreadInbox > 0 && (
                  <span className="profile-tab-badge" aria-label={`${unreadInbox} הודעות שלא נקראו`}>
                    {unreadInbox > 99 ? "99+" : unreadInbox}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </nav>

        <div className="profile-tab-panel card">{children}</div>
      </div>
    </>
  );
}
