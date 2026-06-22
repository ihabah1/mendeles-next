"use client";

import Nav from "@/components/Nav";
import AdminQuickNav from "@/components/admin/AdminQuickNav";

export default function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="admin-layout-toolbar">
        <div className="admin-page-wrap admin-layout-toolbar-inner">
          <AdminQuickNav />
        </div>
      </div>
      {children}
    </>
  );
}
