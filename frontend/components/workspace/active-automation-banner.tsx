"use client";

import { Button } from "@/components/ui/button";
import type { AiSeoScheduledAutomation } from "@/lib/api/dashboard";

const RECURRENCE_INTERVAL_LABELS: Record<string, string> = {
  hourly: "כל שעה",
  every_6_hours: "כל 6 שעות",
  every_24_hours: "כל 24 שעות",
  every_2_days: "כל יומיים",
};

export function formatScheduledAutomationSummary(automation: AiSeoScheduledAutomation): string {
  const parts: string[] = [];
  if (automation.news_hot_topics_enabled) parts.push("חדשות חמות");
  if (automation.international_news_translation_enabled) parts.push("תרגום חדשות בינלאומיות");
  if (automation.random_topics_enabled) parts.push("נושאים אקראיים");
  if (automation.auto_publish_enabled) parts.push("פרסום אוטומטי");
  if (automation.recurrence_minutes > 0) {
    parts.push(`חוזר כל ${automation.recurrence_minutes} דקות`);
  } else if (automation.recurrence_interval) {
    parts.push(`חוזר ${RECURRENCE_INTERVAL_LABELS[automation.recurrence_interval] ?? automation.recurrence_interval}`);
  }
  if (automation.scheduled_jobs_count > 0) {
    parts.push(`${automation.scheduled_jobs_count} ריצות ממתינות`);
  }
  if (automation.pending_jobs_count > 0 && automation.scheduled_jobs_count === 0) {
    parts.push(`${automation.pending_jobs_count} משימות פעילות`);
  }
  return parts.join(" · ");
}

type ActiveAutomationBannerProps = {
  automation: AiSeoScheduledAutomation;
  canCancel?: boolean;
  cancelPending?: boolean;
  onCancel?: () => void;
  className?: string;
};

export function ActiveAutomationBanner({
  automation,
  canCancel = false,
  cancelPending = false,
  onCancel,
  className = "",
}: ActiveAutomationBannerProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 ${className}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-200">
            פעיל
          </span>
          <p className="text-sm font-semibold text-white">אוטומציה פעילה</p>
        </div>
        <p className="text-sm text-emerald-100/90">{formatScheduledAutomationSummary(automation)}</p>
        {automation.next_run_at ? (
          <p className="text-xs text-emerald-200/70">
            הריצה הבאה: {new Date(automation.next_run_at).toLocaleString("he-IL")}
          </p>
        ) : null}
      </div>
      {canCancel && onCancel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cancelPending}
          onClick={onCancel}
          className="shrink-0 border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
        >
          {cancelPending ? "מבטל..." : "ביטול"}
        </Button>
      ) : null}
    </div>
  );
}
