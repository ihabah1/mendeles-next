"use client";

export default function AdminNavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="admin-nav-badge" aria-label={`${count} עדכונים חדשים`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
