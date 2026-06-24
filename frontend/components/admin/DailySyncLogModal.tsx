"use client";

import { useEffect, useRef } from "react";

export type SyncLogStatus = "running" | "success" | "error";

export default function DailySyncLogModal({
  open,
  status,
  lines,
  elapsedSec,
  detail,
  onClose,
}: {
  open: boolean;
  status: SyncLogStatus;
  lines: string[];
  elapsedSec: number;
  detail?: string;
  onClose: () => void;
}) {
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tailRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, status]);

  if (!open) return null;

  const statusLabel =
    status === "running" ? "מריץ סנכרון…" : status === "success" ? "הסנכרון הושלם" : "הסנכרון נכשל";

  return (
    <div
      className="sync-log-overlay"
      role="dialog"
      aria-modal
      aria-labelledby="sync-log-title"
      onClick={onClose}
    >
      <div className="sync-log-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="sync-log-header">
          <div>
            <h2 id="sync-log-title" className="sync-log-title">
              לוג סנכרון יומי
            </h2>
            <p className="sync-log-subtitle">
              {statusLabel}
              {elapsedSec > 0 ? ` · ${elapsedSec} שניות` : ""}
            </p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={status === "running"}>
            סגור
          </button>
        </div>

        {detail && (
          <div
            className={`sync-log-banner${status === "success" ? " sync-log-banner--ok" : status === "error" ? " sync-log-banner--err" : ""}`}
          >
            {detail}
          </div>
        )}

        <div className="sync-log-console" role="log" aria-live="polite" aria-busy={status === "running"}>
          {lines.length === 0 ? (
            <div className="sync-log-line sync-log-line--muted">ממתין לפלט מהשרת…</div>
          ) : (
            lines.map((line, i) => (
              <div
                key={`${i}-${line.slice(0, 24)}`}
                className={`sync-log-line${
                  line.startsWith("✓") ? " sync-log-line--ok" : line.startsWith("✗") || line.startsWith("!") ? " sync-log-line--err" : ""
                }`}
              >
                {line}
              </div>
            ))
          )}
          {status === "running" && <div className="sync-log-line sync-log-line--pulse">▌</div>}
          <div ref={tailRef} />
        </div>
      </div>
    </div>
  );
}
