"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBackendOrigin } from "@/hooks/useBackendOrigin";

export type AdminTabId =
  | "dashboard"
  | "scan"
  | "print-queue"
  | "permissions"
  | "balance"
  | "messages"
  | "support"
  | "monitoring"
  | "services";

const TABS: { id: AdminTabId; href: string; label: string; title: string }[] = [
  { id: "dashboard", href: "/admin", label: "דשבורד", title: "הזמנות, זכיות ותוצאות הגרלה" },
  { id: "scan", href: "/admin/scan", label: "מסך סריקה", title: "העלאת וצפייה בסריקות טפסים" },
  { id: "print-queue", href: "/admin/print-queue", label: "תור הדפסה", title: "ניהול הדפסה והגשה" },
  { id: "permissions", href: "/admin/permissions", label: "הרשאות", title: "משתמשים ותפקידים" },
  { id: "balance", href: "/admin/balance", label: "יתרות", title: "עדכון ארנק לקוחות" },
  { id: "messages", href: "/admin/messages", label: "מכתבים", title: "הודעות ללקוחות" },
  { id: "support", href: "/admin/support", label: "פניות צ׳אט", title: "שיחות בוט וסיכומי AI" },
  { id: "monitoring", href: "/admin/monitoring", label: "ניטור", title: "אוטומציה, תנועה ותשתית" },
  { id: "services", href: "/admin/services", label: "שירותים", title: "הפעלה וכיבוי תכונות" },
];

function activeTabFromPath(pathname: string): AdminTabId {
  if (pathname.startsWith("/admin/scan")) return "scan";
  if (pathname.startsWith("/admin/print-queue")) return "print-queue";
  if (pathname.startsWith("/admin/permissions")) return "permissions";
  if (pathname.startsWith("/admin/balance")) return "balance";
  if (pathname.startsWith("/admin/messages")) return "messages";
  if (pathname.startsWith("/admin/support")) return "support";
  if (pathname.startsWith("/admin/monitoring")) return "monitoring";
  if (pathname.startsWith("/admin/services")) return "services";
  return "dashboard";
}

export default function AdminNavTabs({ active }: { active?: AdminTabId }) {
  const pathname = usePathname();
  const backendOrigin = useBackendOrigin();
  const current = active ?? activeTabFromPath(pathname ?? "");
  const djangoAdminUrl = `${backendOrigin}/admin/`;

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
            {tab.label}
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
