"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Hub = "orders" | "users";

const SECTIONS: Record<
  Hub,
  { href: string; label: string; match: (path: string) => boolean }[]
> = {
  orders: [
    {
      href: "/admin/orders",
      label: "רשימת הזמנות",
      match: (p) => p === "/admin/orders" || p === "/admin/orders/",
    },
    {
      href: "/admin/print-queue",
      label: "תור הדפסה",
      match: (p) => p.startsWith("/admin/print-queue"),
    },
    {
      href: "/admin/scan",
      label: "מסך סריקה",
      match: (p) => p.startsWith("/admin/scan"),
    },
  ],
  users: [
    {
      href: "/admin/users",
      label: "סקירה",
      match: (p) => p === "/admin/users" || p === "/admin/users/",
    },
    {
      href: "/admin/permissions",
      label: "הרשאות",
      match: (p) => p.startsWith("/admin/permissions"),
    },
    {
      href: "/admin/balance",
      label: "יתרות",
      match: (p) => p.startsWith("/admin/balance"),
    },
    {
      href: "/admin/messages",
      label: "מכתבים",
      match: (p) => p.startsWith("/admin/messages"),
    },
    {
      href: "/admin/support",
      label: "פניות צ׳אט",
      match: (p) => p.startsWith("/admin/support"),
    },
  ],
};

export default function AdminHubSubNav({ hub }: { hub: Hub }) {
  const pathname = usePathname() ?? "";
  const items = SECTIONS[hub];

  return (
    <nav
      className="admin-hub-subnav"
      aria-label={hub === "orders" ? "תת-ניווט הזמנות" : "תת-ניווט משתמשים"}
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-tab${active ? " admin-tab--active" : " admin-tab--inactive"}`}
            aria-current={active ? "page" : undefined}
            style={{ textDecoration: "none", fontSize: ".78rem" }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
