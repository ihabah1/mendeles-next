"use client";

import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import AdminHubSubNav from "@/components/admin/AdminHubSubNav";
import AdminOrdersPanel from "@/components/admin/AdminOrdersPanel";

export default function AdminOrdersPage() {
  return (
    <ProtectedRoute adminOnly>
      <Nav />
      <div className="admin-page-wrap">
        <AdminNavTabs active="orders" />
        <main id="admin-main" className="admin-main">
          <AdminHubSubNav hub="orders" />
          <h1 className="admin-page-title" style={{ marginBottom: 20 }}>
            ניהול הזמנות
          </h1>
          <AdminOrdersPanel />
        </main>
      </div>
    </ProtectedRoute>
  );
}
