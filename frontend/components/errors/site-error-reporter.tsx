"use client";

import { useEffect } from "react";
import { backendBase } from "@/lib/api/backend-url";

export function SiteErrorReporter() {
  useEffect(() => {
    async function report(message: string, extra?: Record<string, unknown>) {
      try {
        await fetch(`${backendBase()}/api/v1/errors/report/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            source: "frontend",
            url: window.location.href,
            ...extra,
          }),
          keepalive: true,
        });
      } catch {
        // ignore reporting failures
      }
    }

    function onError(event: ErrorEvent) {
      report(event.message || "Unknown error", {
        stack_trace: event.error?.stack || "",
        metadata: { filename: event.filename, lineno: event.lineno },
      });
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      report(reason?.message || String(reason), {
        stack_trace: reason?.stack || "",
        metadata: { type: "unhandledrejection" },
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
