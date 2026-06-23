"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { inboxService } from "@/lib/api/inbox";

export default function NavNotificationsBell() {
  const path = usePathname();
  const [unread, setUnread] = useState(0);

  const refresh = () => {
    if (localStorage.getItem("demo_mode") === "1") {
      setUnread(1);
      return;
    }
    inboxService
      .unreadCount()
      .then(setUnread)
      .catch(() => setUnread(0));
  };

  useEffect(() => {
    refresh();
  }, [path]);

  useEffect(() => {
    const onUnreadChange = (e: Event) => {
      const count = (e as CustomEvent<number>).detail;
      if (typeof count === "number") setUnread(count);
      else refresh();
    };
    window.addEventListener("inbox-unread-changed", onUnreadChange);
    return () => window.removeEventListener("inbox-unread-changed", onUnreadChange);
  }, []);

  const isActive = path?.startsWith("/profile/inbox");

  return (
    <Link
      href="/profile/inbox"
      className={`nav-notifications${isActive ? " active" : ""}`}
      aria-label={unread > 0 ? `${unread} הודעות חדשות` : "הודעות"}
      title="הודעות"
    >
      <span className="nav-notifications-icon" aria-hidden>
        🔔
      </span>
      {unread > 0 && (
        <span className="nav-notifications-badge" aria-hidden>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
