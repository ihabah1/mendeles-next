"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminTabId } from "@/components/admin/AdminNavTabs";
import api from "@/lib/api/client";

const ACK_KEY = "mandeles-admin-nav-ack";
const POLL_MS = 45_000;

type SectionCounts = Record<AdminTabId, number>;

const TAB_IDS: AdminTabId[] = [
  "dashboard",
  "scan",
  "print-queue",
  "permissions",
  "balance",
  "messages",
  "support",
  "monitoring",
  "services",
  "kiosks",
];

function emptyCounts(): SectionCounts {
  return Object.fromEntries(TAB_IDS.map((id) => [id, 0])) as SectionCounts;
}

function readAck(): Partial<Record<AdminTabId, number>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) || "{}") as Partial<
      Record<AdminTabId, number>
    >;
  } catch {
    return {};
  }
}

export function markAdminSectionSeen(id: AdminTabId, count: number) {
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
    const next = emptyCounts();
    for (const id of TAB_IDS) {
      next[id] = data.sections?.[id]?.count ?? 0;
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
    markAdminSectionSeen(current, counts[current]);
  }, [current, counts]);

  const ack = useMemo(() => readAck(), [tick, counts]);

  const badgeFor = useCallback(
    (id: AdminTabId): number => {
      const total = counts[id] ?? 0;
      const seen = ack[id] ?? 0;
      return Math.max(0, total - seen);
    },
    [counts, ack],
  );

  return { badgeFor, counts };
}
