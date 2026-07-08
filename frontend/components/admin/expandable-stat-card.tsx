"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type DailyRow = { date: string; count: number };

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  daily?: DailyRow[];
  dailyLabel?: string;
};

export function ExpandableStatCard({ label, value, hint, accent, daily, dailyLabel }: Props) {
  const [open, setOpen] = useState(false);
  const hasDaily = daily && daily.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm",
        accent && "border-[var(--accent)]/30 bg-[var(--accent-muted)]/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
        {hasDaily && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={dailyLabel || "Daily breakdown"}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-sm font-bold leading-none hover:bg-[var(--muted)]"
          >
            {open ? "−" : "+"}
          </button>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted-fg)]">{hint}</p>}
      {open && hasDaily && (
        <ul className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-xs">
          {daily.map((row) => (
            <li key={row.date} className="flex items-center justify-between gap-2">
              <span className="text-[var(--muted-fg)]">
                {new Date(row.date).toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="font-semibold">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
