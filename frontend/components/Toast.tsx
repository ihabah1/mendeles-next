"use client";
import { useState, useEffect, useCallback } from "react";

interface ToastItem { id: number; msg: string; type: "ok" | "err" | "info"; }

let addToast: ((msg: string, type?: "ok" | "err" | "info") => void) | null = null;

export function toast(msg: string, type: "ok" | "err" | "info" = "ok") {
  addToast?.(msg, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let nextId = 0;

  const add = useCallback((msg: string, type: "ok" | "err" | "info" = "ok") => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  useEffect(() => { addToast = add; return () => { addToast = null; }; }, [add]);

  const colors = { ok: "#1db96a", err: "#ff6b7a", info: "#c9a84c" };

  return (
    <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: "var(--navy-c)", border: `1px solid ${colors[t.type]}`, borderRadius: 9, padding: "8px 16px", fontSize: ".76rem", fontWeight: 600, color: colors[t.type], whiteSpace: "nowrap", animation: "fadeIn .18s ease" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
