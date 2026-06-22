"use client";

import { Suspense } from "react";
import { PrintQueuePageInner } from "../print-queue/page";

export default function AdminScanPage() {
  return (
    <Suspense fallback={<p style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>טוען מסך סריקה...</p>}>
      <PrintQueuePageInner variant="scan" />
    </Suspense>
  );
}
