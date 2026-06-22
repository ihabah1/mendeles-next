"use client";

import Link from "next/link";
import AdminHubSubNav from "@/components/admin/AdminHubSubNav";
import AdminNavBadge from "@/components/admin/AdminNavBadge";
import { useAdminNavAlerts } from "@/hooks/useAdminNavAlerts";

const USER_SECTIONS = [
  {
    href: "/admin/permissions",
    icon: "🔐",
    title: "הרשאות",
    desc: "משתמשים, תפקידים, Premium ומחיקה",
    alertKey: "permissions" as const,
  },
  {
    href: "/admin/balance",
    icon: "💳",
    title: "יתרות",
    desc: "עדכון ארנק לקוחות",
    alertKey: "balance" as const,
  },
  {
    href: "/admin/messages",
    icon: "✉️",
    title: "מכתבים",
    desc: "הודעות ומכתבים ללקוחות",
    alertKey: "messages" as const,
  },
  {
    href: "/admin/support",
    icon: "💬",
    title: "פניות צ׳אט",
    desc: "שיחות בוט, סיכום AI ובקשות נציג",
    alertKey: "support" as const,
  },
];

export default function AdminUsersPage() {
  const { badgeFor } = useAdminNavAlerts("users");

  return (
    <div className="admin-page-wrap">
      <main id="admin-main" className="admin-main">
        <AdminHubSubNav hub="users" />
        <h1 className="admin-page-title" style={{ marginBottom: 8 }}>
          ניהול משתמשים
        </h1>
        <p
          style={{
            color: "var(--text2)",
            fontSize: ".82rem",
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          הרשאות, יתרות ארנק, הודעות ללקוחות ופניות תמיכה — הכל במקום אחד.
        </p>
        <nav className="admin-quick-nav" aria-label="אזורי ניהול משתמשים">
          <ul className="admin-quick-nav-grid">
            {USER_SECTIONS.map((item) => {
              const badge = badgeFor(item.alertKey);
              return (
                <li key={item.href}>
                  <Link href={item.href} className="admin-quick-card">
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
      </main>
    </div>
  );
}
