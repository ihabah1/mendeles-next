"use client";

import AdminHubSubNav from "@/components/admin/AdminHubSubNav";
import AdminOrdersPanel from "@/components/admin/AdminOrdersPanel";

export default function AdminOrdersPage() {
  return (
    <div className="admin-page-wrap">
      <main id="admin-main" className="admin-main">
        <AdminHubSubNav hub="orders" />
        <h1 className="admin-page-title" style={{ marginBottom: 20 }}>
          ניהול הזמנות
        </h1>
        <AdminOrdersPanel />
      </main>
    </div>
  );
}
