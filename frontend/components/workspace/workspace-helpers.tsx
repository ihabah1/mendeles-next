"use client";

import type { AiSeoWorkspaceDraft, AiSeoWorkspaceJob } from "@/lib/api/dashboard";
import { Button } from "@/components/ui/button";

export const NEWS_DOMAIN_VALUES = new Set([
  "sports",
  "economy",
  "current_affairs",
  "world_news",
  "international_news",
]);

export const DOMAIN_ICONS: Record<string, string> = {
  law: "⚖️",
  real_estate: "🏠",
  insurance: "🛡️",
  finance: "💰",
  medical: "🏥",
  dentistry: "🦷",
  beauty: "💄",
  fitness: "💪",
  home_services: "🔧",
  automotive: "🚗",
  education: "🎓",
  tourism: "✈️",
  restaurants: "🍽️",
  ecommerce: "🛒",
  b2b: "🏢",
  cyber: "🔐",
  marketing: "📣",
  events: "🎉",
  nonprofits: "🤝",
  local_business: "📍",
  sports: "⚽",
  economy: "📈",
  current_affairs: "📰",
  world_news: "🌍",
  international_news: "🗞️",
};

export function pageLocale(locale?: string): "he" | "en" {
  return locale === "en" ? "en" : "he";
}

export const TABLE_PAGE_SIZE = 4;

export function splitLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function textValue(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === "string" ? value : "";
}

export function plainPreview(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function toLocalInputValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function buildEffectivePrompt(prompt: string, writingTone: string, writingStyle: string): string {
  const parts = [prompt.trim()];
  if (writingTone) parts.push(`רמת כתיבה: ${writingTone}`);
  if (writingStyle) parts.push(`סגנון: ${writingStyle}`);
  return parts.filter(Boolean).join("\n");
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
}

export function pageSlice<T>(items: T[], page: number): T[] {
  return items.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE);
}

export function jobStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    running: "בתהליך",
    queued: "ממתין",
    scheduled: "מתוזמן",
    waiting_approval: "ממתין לאישור",
    completed: "הושלם",
    failed: "נכשל",
    cancelled: "בוטל",
  };
  return labels[status] ?? status;
}

export function jobStatusTone(status: string): string {
  if (status === "completed") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (status === "failed" || status === "cancelled") return "bg-red-500/20 text-red-300 border-red-500/30";
  if (status === "running") return "bg-sky-500/20 text-sky-300 border-sky-500/30";
  return "bg-amber-500/20 text-amber-300 border-amber-500/30";
}

export type JobScheduleFields = Pick<AiSeoWorkspaceJob, "status" | "scheduled_at" | "config">;

function parseJobDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function jobNextRunAt(job: JobScheduleFields): Date | null {
  const config = job.config || {};
  const nextRecurring = parseJobDate(textValue(config, "next_recurring_run_at"));
  if (nextRecurring) return nextRecurring;

  const scheduled = parseJobDate(job.scheduled_at);
  if (!scheduled) return null;
  if (job.status === "scheduled") return scheduled;
  if (scheduled.getTime() > Date.now()) return scheduled;
  return null;
}

export function jobNextRunLabel(job: JobScheduleFields): string {
  const nextRun = jobNextRunAt(job);
  if (nextRun) return nextRun.toLocaleString("he-IL");
  if (job.status === "queued" || job.status === "running" || job.status === "scheduled") return "מיידי";
  return "—";
}

export function jobHasScheduledRun(job: JobScheduleFields): boolean {
  return jobNextRunAt(job) !== null;
}

export type JobTab = "all" | "active" | "waiting" | "completed" | "failed";

export function matchesJobTab(status: string, tab: JobTab): boolean {
  if (tab === "all") return true;
  if (tab === "active") return status === "running";
  if (tab === "waiting") return ["queued", "waiting_approval", "scheduled"].includes(status);
  if (tab === "completed") return status === "completed";
  if (tab === "failed") return ["failed", "cancelled"].includes(status);
  return true;
}

export function PaginationControls({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = pageCount(total);
  if (total <= TABLE_PAGE_SIZE) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
      <span>
        עמוד {page} מתוך {totalPages} · מוצגות עד {TABLE_PAGE_SIZE} רשומות
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
        >
          הקודם
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
        >
          הבא
        </Button>
      </div>
    </div>
  );
}

export function DraftPreview({ page }: { page: AiSeoWorkspaceDraft }) {
  const isLandingPage = page.page_type === "landing_page";

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 to-slate-900 text-white shadow-inner">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Preview לפני פרודקשן</p>
        <h3 className="mt-2 text-2xl font-bold">{page.title}</h3>
        {page.meta_description && <p className="mt-2 max-w-3xl text-sm text-slate-300">{page.meta_description}</p>}
        {page.image && typeof page.image.url === "string" && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <img src={page.image.url} alt={typeof page.image.alt === "string" ? page.image.alt : page.title} className="h-56 w-full object-cover" />
            <p className="bg-black/30 px-3 py-2 text-xs text-slate-300">
              {typeof page.image.license === "string" ? page.image.license : "Free stock image"}
            </p>
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        {page.blocks.length === 0 ? (
          <p className="text-sm text-slate-300">אין blocks להצגה בטיוטה הזו.</p>
        ) : (
          page.blocks.map((block) => {
            const config = block.config || {};
            if (block.type === "hero") {
              return (
                <section key={block.id} className="rounded-2xl bg-violet-500/15 p-5">
                  <h4 className="text-xl font-semibold">{textValue(config, "headline") || page.title}</h4>
                  <p className="mt-2 text-sm text-slate-200">{textValue(config, "subheadline")}</p>
                  {textValue(config, "cta") && (
                    <a
                      href={isLandingPage ? "#contact" : "#faq"}
                      className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950"
                    >
                      {textValue(config, "cta")}
                    </a>
                  )}
                </section>
              );
            }
            if (block.type === "faq") {
              const items = Array.isArray(config["items"]) ? config["items"] : [];
              return (
                <section key={block.id} className="rounded-2xl bg-white/5 p-5">
                  <h4 className="font-semibold">שאלות נפוצות</h4>
                  <div className="mt-3 space-y-3">
                    {items.map((item, index) => {
                      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
                      return (
                        <div key={`${block.id}-${index}`} className="rounded-xl bg-black/20 p-3">
                          <p className="font-medium">{textValue(row, "question")}</p>
                          <p className="mt-1 text-sm text-slate-300">{textValue(row, "answer")}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            }
            if (block.type === "cta") {
              return (
                <section key={block.id} className="rounded-2xl border border-violet-300/30 bg-violet-300/10 p-5">
                  <h4 className="text-lg font-semibold">{textValue(config, "headline")}</h4>
                  {textValue(config, "button") && (
                    <a
                      href={isLandingPage ? "#contact" : "#faq"}
                      className="mt-3 inline-flex rounded-full bg-violet-400 px-4 py-2 text-sm font-medium text-slate-950"
                    >
                      {textValue(config, "button")}
                    </a>
                  )}
                </section>
              );
            }
            if (block.type === "contact_form") {
              return (
                <section key={block.id} id="contact" className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
                  <h4 className="text-lg font-semibold">{textValue(config, "headline") || "יצירת קשר"}</h4>
                  <p className="mt-2 text-sm text-slate-300">טופס יצירת קשר יוצג כאן בדף הנחיתה הציבורי.</p>
                </section>
              );
            }
            const html = textValue(config, "html");
            return (
              <section key={block.id} className="rounded-2xl bg-white/5 p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {plainPreview(html) || textValue(config, "text") || textValue(config, "body")}
                </p>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
