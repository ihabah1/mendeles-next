"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PrintQueuePageInner } from "../print-queue/page";

export default function AdminScanPage() {
  return (
    <ProtectedRoute adminOnly>
      <Suspense fallback={<p style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>טוען מסך סריקה...</p>}>
        <PrintQueuePageInner variant="scan" />
      </Suspense>
    </ProtectedRoute>
  );
}
