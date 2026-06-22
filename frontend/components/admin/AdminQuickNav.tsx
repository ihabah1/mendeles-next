"use client";

import Link from "next/link";
import type { AdminTabId } from "@/components/admin/AdminNavTabs";
import AdminNavBadge from "@/components/admin/AdminNavBadge";
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
  const { badgeFor } = useAdminNavAlerts(current);

  return (
    <nav className="admin-quick-nav" aria-label="קיצורי דרך לניהול">
      <h2 className="admin-quick-nav-heading">כל אזורי הניהול</h2>
      <ul className="admin-quick-nav-grid">
        {ITEMS.map((item) => {
          const badge = badgeFor(item.id);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`admin-quick-card${current === item.id ? " admin-quick-card--active" : ""}`}
                aria-current={current === item.id ? "page" : undefined}
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
