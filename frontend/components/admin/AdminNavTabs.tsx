"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNavBadge from "@/components/admin/AdminNavBadge";
import { useBackendOrigin } from "@/hooks/useBackendOrigin";
import { useAdminNavAlerts } from "@/hooks/useAdminNavAlerts";

export type AdminTabId =
  | "dashboard"
  | "orders"
  | "users"
  | "monitoring"
  | "services"
  | "kiosks";

const TABS: { id: AdminTabId; href: string; label: string; title: string }[] = [
  { id: "dashboard", href: "/admin", label: "דשבורד", title: "סטטיסטיקות, זכיות ותוצאות הגרלה" },
  { id: "orders", href: "/admin/orders", label: "הזמנות", title: "רשימת הזמנות, הדפסה וסריקה" },
  { id: "users", href: "/admin/users", label: "משתמשים", title: "הרשאות, יתרות, מכתבים ותמיכה" },
  { id: "monitoring", href: "/admin/monitoring", label: "ניטור", title: "אוטומציה, תנועה ותשתית" },
  { id: "services", href: "/admin/services", label: "שירותים", title: "הפעלה וכיבוי תכונות" },
  { id: "kiosks", href: "/admin/kiosks", label: "דוכנים", title: "יצירה וניהול דוכני קiosk" },
];

function activeTabFromPath(pathname: string): AdminTabId {
  if (
    pathname.startsWith("/admin/orders") ||
    pathname.startsWith("/admin/print-queue") ||
    pathname.startsWith("/admin/scan")
  ) {
    return "orders";
  }
  if (
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/permissions") ||
    pathname.startsWith("/admin/balance") ||
    pathname.startsWith("/admin/messages") ||
    pathname.startsWith("/admin/support")
  ) {
    return "users";
  }
  if (pathname.startsWith("/admin/monitoring")) return "monitoring";
  if (pathname.startsWith("/admin/services")) return "services";
  if (pathname.startsWith("/admin/kiosks")) return "kiosks";
  return "dashboard";
}

export default function AdminNavTabs({ active }: { active?: AdminTabId }) {
  const pathname = usePathname();
  const backendOrigin = useBackendOrigin();
  const current = active ?? activeTabFromPath(pathname ?? "");
  const djangoAdminUrl = `${backendOrigin}/admin/`;
  const { badgeFor } = useAdminNavAlerts(current);

  return (
    <div className="admin-tabs-shell">
      <nav className="admin-tabs-bar" aria-label="ניווט אדמין">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`admin-tab${current === tab.id ? " admin-tab--active" : " admin-tab--inactive"}`}
            aria-current={current === tab.id ? "page" : undefined}
            title={tab.title}
          >
            <span className="admin-tab-label">{tab.label}</span>
            <AdminNavBadge count={badgeFor(tab.id)} />
          </Link>
        ))}
        <a
          href={djangoAdminUrl}
          target="_blank"
          rel="noreferrer"
          className="admin-tab admin-tab--inactive admin-tab--external"
        >
          Django ↗
        </a>
      </nav>
    </div>
  );
}
