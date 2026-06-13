"use client";

import Link from "next/link";
import type { AdminTabId } from "@/components/admin/AdminNavTabs";

type QuickItem = {
  id: AdminTabId;
  href: string;
  icon: string;
  title: string;
  desc: string;
};

const ITEMS: QuickItem[] = [
  { id: "dashboard", href: "/admin", icon: "📊", title: "דשבורד", desc: "הזמנות, זכיות, תוצאות הגרלה ולוגים" },
  { id: "scan", href: "/admin/scan", icon: "📄", title: "מסך סריקה", desc: "העלאת וצפייה בסריקות טפסים" },
  { id: "print-queue", href: "/admin/print-queue", icon: "🖨️", title: "תור הדפסה", desc: "ניהול הדפסה והגשה לדוכן" },
  { id: "permissions", href: "/admin/permissions", icon: "🔐", title: "הרשאות", desc: "משתמשים, תפקידים ומחיקה" },
  { id: "balance", href: "/admin/balance", icon: "💳", title: "יתרות", desc: "עדכון ארנק לקוחות" },
  { id: "messages", href: "/admin/messages", icon: "✉️", title: "מכתבים", desc: "הודעות ומכתבים ללקוחות" },
  { id: "support", href: "/admin/support", icon: "💬", title: "פניות צ׳אט", desc: "שיחות בוט, סיכום AI ובקשות נציג" },
  { id: "monitoring", href: "/admin/monitoring", icon: "📡", title: "ניטור תשתית", desc: "אוטומציה, תנועה, קבצים ושירותים" },
  { id: "services", href: "/admin/services", icon: "⚙️", title: "שירותים", desc: "הפעלה/כיבוי תכונות באתר" },
];

export default function AdminQuickNav({ current }: { current?: AdminTabId }) {
  return (
    <nav className="admin-quick-nav" aria-label="קיצורי דרך לניהול">
      <h2 className="admin-quick-nav-heading">כל אזורי הניהול</h2>
      <ul className="admin-quick-nav-grid">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`admin-quick-card${current === item.id ? " admin-quick-card--active" : ""}`}
              aria-current={current === item.id ? "page" : undefined}
            >
              <span className="admin-quick-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="admin-quick-title">{item.title}</span>
              <span className="admin-quick-desc">{item.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
