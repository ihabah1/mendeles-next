"use client";

import { useEffect } from "react";
import Nav from "@/components/Nav";
import AdminQuickNav from "@/components/admin/AdminQuickNav";

export default function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("admin-theme-active");
    return () => document.body.classList.remove("admin-theme-active");
  }, []);

  return (
    <div className="admin-theme">
      <Nav />
      <div className="admin-layout-toolbar">
        <div className="admin-page-wrap admin-layout-toolbar-inner">
          <AdminQuickNav />
        </div>
      </div>
      {children}
    </div>
  );
}
