"use client";

import { useEffect } from "react";
import { metricsPing } from "@/lib/api/monitoring-admin";

const VISITOR_KEY = "mandeles-visitor-id";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** Lightweight once-per-session visit ping for admin monitoring. */
export default function SiteMetricsPing() {
  useEffect(() => {
    const key = "mandeles-metrics-pinged";
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* continue */
    }
    metricsPing(getVisitorId());
  }, []);
  return null;
}
