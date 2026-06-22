"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminTabId } from "@/components/admin/AdminNavTabs";
import api from "@/lib/api/client";

const ACK_KEY = "mandeles-admin-nav-ack";
const POLL_MS = 45_000;

export type AdminAlertSectionId =
  | AdminTabId
  | "permissions"
  | "balance"
  | "messages"
  | "support"
  | "scan"
  | "print-queue";

type SectionCounts = Partial<Record<AdminAlertSectionId, number>>;

const TAB_IDS: AdminTabId[] = [
  "dashboard",
  "orders",
  "users",
  "monitoring",
  "services",
  "kiosks",
];

function emptyCounts(): SectionCounts {
  return {};
}

function readAck(): SectionCounts {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) || "{}") as SectionCounts;
  } catch {
    return {};
  }
}

export function markAdminSectionSeen(id: AdminAlertSectionId, count: number) {
  if (typeof window === "undefined") return;
  const ack = readAck();
  if (ack[id] === count) return;
  ack[id] = count;
  localStorage.setItem(ACK_KEY, JSON.stringify(ack));
  notifySubscribers();
}

let sharedCounts: SectionCounts | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let fetchInFlight = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

async function fetchAlerts() {
  if (fetchInFlight) return;
  fetchInFlight = true;
  try {
    const { data } = await api.get<{ sections: Record<string, { count: number }> }>(
      "/admin/nav-alerts/",
    );
    const next: SectionCounts = {};
    for (const [key, val] of Object.entries(data.sections || {})) {
      next[key as AdminAlertSectionId] = val.count ?? 0;
    }
    sharedCounts = next;
    notifySubscribers();
  } catch {
    /* ignore — badges optional */
  } finally {
    fetchInFlight = false;
  }
}

function ensurePolling() {
  if (pollTimer) return;
  void fetchAlerts();
  pollTimer = setInterval(() => void fetchAlerts(), POLL_MS);
}

export function useAdminNavAlerts(current?: AdminTabId) {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    subscribers.add(bump);
    ensurePolling();
    return () => {
      subscribers.delete(bump);
      if (subscribers.size === 0 && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  }, [bump]);

  const counts = useMemo(() => sharedCounts ?? emptyCounts(), [tick]);

  useEffect(() => {
    if (!current) return;
    markAdminSectionSeen(current, counts[current] ?? 0);
  }, [current, counts]);

  const ack = useMemo(() => readAck(), [tick, counts]);

  const badgeFor = useCallback(
    (id: AdminAlertSectionId): number => {
      const total = counts[id] ?? 0;
      const seen = ack[id] ?? 0;
      return Math.max(0, total - seen);
    },
    [counts, ack],
  );

  return { badgeFor, counts };
}
