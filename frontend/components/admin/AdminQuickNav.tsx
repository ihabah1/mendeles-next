"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminTabId } from "@/lib/admin-nav";
import { adminTabFromPath } from "@/lib/admin-nav";
import AdminNavBadge from "@/components/admin/AdminNavBadge";
import { useBackendOrigin } from "@/hooks/useBackendOrigin";
import { useAdminNavAlerts } from "@/hooks/useAdminNavAlerts";

type QuickItem = {
  id: AdminTabId;
  href: string;
  icon: string;
  title: string;
  desc: string;
};

const ITEMS: QuickItem[] = [
  {
    id: "dashboard",
    href: "/admin",
    icon: "📊",
    title: "דשבורד",
    desc: "סטטיסטיקות, זכיות ותוצאות הגרלה",
  },
  {
    id: "orders",
    href: "/admin/orders",
    icon: "📋",
    title: "הזמנות",
    desc: "רשימה, הדפסה, חשבוניות וסריקה",
  },
  {
    id: "users",
    href: "/admin/users",
    icon: "👥",
    title: "משתמשים",
    desc: "הרשאות, יתרות, מכתבים ותמיכה",
  },
  {
    id: "monitoring",
    href: "/admin/monitoring",
    icon: "📡",
    title: "ניטור תשתית",
    desc: "אוטומציה, תנועה, קבצים ושירותים",
  },
  {
    id: "services",
    href: "/admin/services",
    icon: "⚙️",
    title: "שירותים",
    desc: "הפעלה/כיבוי תכונות באתר",
  },
  {
    id: "kiosks",
    href: "/admin/kiosks",
    icon: "🏪",
    title: "דוכנים",
    desc: "יצירת דוכנים והתחברות לתוכנה",
  },
];

export default function AdminQuickNav({ current }: { current?: AdminTabId }) {
  const pathname = usePathname() ?? "";
  const active = current ?? adminTabFromPath(pathname);
  const backendOrigin = useBackendOrigin();
  const djangoAdminUrl = `${backendOrigin}/admin/`;
  const { badgeFor } = useAdminNavAlerts(active);

  return (
    <nav className="admin-quick-nav admin-quick-nav--toolbar" aria-label="קיצורי דרך לניהול">
      <div className="admin-quick-nav-head">
        <h2 className="admin-quick-nav-heading">כל אזורי הניהול</h2>
        <a
          href={djangoAdminUrl}
          target="_blank"
          rel="noreferrer"
          className="admin-quick-nav-django"
        >
          Django ↗
        </a>
      </div>
      <ul className="admin-quick-nav-grid">
        {ITEMS.map((item) => {
          const badge = badgeFor(item.id);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`admin-quick-card${active === item.id ? " admin-quick-card--active" : ""}`}
                aria-current={active === item.id ? "page" : undefined}
              >
                <AdminNavBadge count={badge} />
                <span className="admin-quick-icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="admin-quick-title">{item.title}</span>
                <span className="admin-quick-desc">{item.desc}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
