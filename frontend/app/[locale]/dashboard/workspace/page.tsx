"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/i18n/navigation";
import {
  aiSeoApi,
  type AiSeoResearchRow,
  type AiSeoWorkspaceDraft,
  type AiSeoWorkspaceHistory,
  type AiSeoWorkspaceJob,
} from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function splitLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function textValue(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === "string" ? value : "";
}

function plainPreview(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const DISABLE_AUTO_RUN_STORAGE_KEY = "ai-seo-disable-auto-run";

function isRunnableJob(job: Pick<AiSeoWorkspaceJob, "status">): boolean {
  return job.status === "queued" || job.status === "running";
}

function toLocalInputValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const TABLE_PAGE_SIZE = 4;

function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
}

function pageSlice<T>(items: T[], page: number): T[] {
  return items.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE);
}

function PaginationControls({
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
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-fg)]">
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
        >
          הקודם
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          הבא
        </Button>
      </div>
    </div>
  );
}

function DraftPreview({ page }: { page: AiSeoWorkspaceDraft }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-slate-950 to-slate-900 text-white shadow-inner">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Preview לפני פרודקשן</p>
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
                <section key={block.id} className="rounded-2xl bg-sky-500/15 p-5">
                  <h4 className="text-xl font-semibold">{textValue(config, "headline") || page.title}</h4>
                  <p className="mt-2 text-sm text-slate-200">{textValue(config, "subheadline")}</p>
                  {textValue(config, "cta") && (
                    <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
                      {textValue(config, "cta")}
                    </span>
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
                <section key={block.id} className="rounded-2xl border border-sky-300/30 bg-sky-300/10 p-5">
                  <h4 className="text-lg font-semibold">{textValue(config, "headline")}</h4>
                  {textValue(config, "button") && (
                    <span className="mt-3 inline-flex rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950">
                      {textValue(config, "button")}
                    </span>
                  )}
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

export default function WorkspacePage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("ai_seo.view");
  const canManage = hasPermission("ai_seo.manage");
  const canPublish = hasPermission("content.publish");
  const qc = useQueryClient();

  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [keywordsText, setKeywordsText] = useState("");
  const [outputTypes, setOutputTypes] = useState<string[]>(["blog", "landing_page"]);
  const [prompt, setPrompt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState("");
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [randomTopicsEnabled, setRandomTopicsEnabled] = useState(false);
  const [randomTopicCount, setRandomTopicCount] = useState(2);
  const [landingDesignEnabled, setLandingDesignEnabled] = useState(true);
  const [freeImageEnabled, setFreeImageEnabled] = useState(true);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedResearchIds, setSelectedResearchIds] = useState<string[]>([]);
  const [researchScheduleHours, setResearchScheduleHours] = useState(1);
  const [researchPage, setResearchPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);
  const [draftsPage, setDraftsPage] = useState(1);
  const [feedbackByPage, setFeedbackByPage] = useState<Record<string, string>>({});
  const [disableAutoRunJobs, setDisableAutoRunJobs] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISABLE_AUTO_RUN_STORAGE_KEY) === "1";
  });
  const [queueRunning, setQueueRunning] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [expandedPreviewIds, setExpandedPreviewIds] = useState<string[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  const workspace = useQuery({
    queryKey: ["ai-seo-workspace"],
    queryFn: aiSeoApi.workspace,
    enabled: canView,
    refetchInterval: 10000,
  });

  const research = useQuery({
    queryKey: ["ai-seo-workspace-research"],
    queryFn: aiSeoApi.workspaceResearch,
    enabled: canView,
    refetchInterval: 60000,
  });

  const domains = workspace.data?.domains ?? [];
  const selectedRows = useMemo(
    () => domains.filter((d) => selectedDomains.includes(d.value)),
    [domains, selectedDomains],
  );

  const generate = useMutation({
    mutationFn: () =>
      aiSeoApi.generateWorkspaceBatch({
        domains: selectedDomains,
        keywords: splitLines(keywordsText),
        output_types: outputTypes,
        prompt,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        publish_at: publishAt ? new Date(publishAt).toISOString() : undefined,
        recurrence_interval: recurrenceInterval || undefined,
        auto_publish_enabled: autoPublishEnabled,
        random_topics_enabled: randomTopicsEnabled,
        random_topic_count: randomTopicCount,
        landing_design_enabled: landingDesignEnabled,
        free_image_enabled: freeImageEnabled,
        locale: "he",
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      if (data.jobs.some(isRunnableJob)) {
        autoStartQueueIfEnabled();
      }
    },
  });

  const refreshResearch = useMutation({
    mutationFn: () =>
      aiSeoApi.refreshWorkspaceResearch({
        domains: selectedDomains,
        keywords: splitLines(keywordsText),
        refresh: true,
      }),
    onSuccess: (data) => {
      qc.setQueryData(["ai-seo-workspace-research"], data);
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace-research"] });
    },
  });

  const scheduleResearchJobs = useMutation({
    mutationFn: (rows: AiSeoResearchRow[]) => {
      const scheduleDate = new Date(Date.now() + Math.max(0, researchScheduleHours) * 60 * 60 * 1000);
      const domainsFromRows = Array.from(new Set(rows.map((row) => row.category_value).filter(Boolean)));
      return aiSeoApi.generateWorkspaceBatch({
        domains: selectedDomains.length ? selectedDomains : domainsFromRows,
        keywords: rows.map((row) => row.keyword),
        output_types: ["blog", "landing_page"],
        prompt: prompt || "Generate from SEO research selected phrases.",
        scheduled_at: scheduleDate.toISOString(),
        auto_publish_enabled: autoPublishEnabled,
        locale: "he",
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      setSelectedResearchIds([]);
      if (data.jobs.some(isRunnableJob)) {
        autoStartQueueIfEnabled();
      }
    },
  });

  const publish = useMutation<unknown, Error, AiSeoWorkspaceDraft>({
    mutationFn: (page: AiSeoWorkspaceDraft) =>
      page.source_job_id ? aiSeoApi.publishWorkspaceJob(page.source_job_id) : aiSeoApi.publishWorkspacePage(page.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const publishJob = useMutation({
    mutationFn: (jobId: string) => aiSeoApi.publishWorkspaceJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const regenerate = useMutation({
    mutationFn: (page: AiSeoWorkspaceDraft) => {
      const keywords = splitLines(keywordsText);
      const domain = selectedRows.map((d) => d.label).join(", ");
      return aiSeoApi.regenerateWorkspacePage({
        page_id: page.id,
        feedback: feedbackByPage[page.id] || "",
        keywords: keywords.length ? keywords : undefined,
        domain: domain || undefined,
      });
    },
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      if (isRunnableJob(job)) {
        autoStartQueueIfEnabled(job.id);
      }
    },
  });

  const runNextStep = useMutation({
    mutationFn: aiSeoApi.runNextWorkspaceQueueStep,
    onSuccess: (data) => {
      qc.setQueryData(["ai-seo-workspace"], data.workspace);
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      if (!data.job || ["failed", "waiting_approval"].includes(data.job.status)) {
        setQueueRunning(false);
        return;
      }
      window.setTimeout(() => setQueueTick((tick) => tick + 1), 600);
    },
    onError: () => setQueueRunning(false),
  });

  const runSelectedJob = useMutation({
    mutationFn: (jobId: string) => aiSeoApi.runWorkspaceJob(jobId),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      if (["completed", "failed", "cancelled", "waiting_approval"].includes(job.status)) {
        setQueueRunning(false);
        return;
      }
      window.setTimeout(() => setQueueTick((tick) => tick + 1), 600);
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      window.setTimeout(() => setQueueTick((tick) => tick + 1), 1200);
    },
  });

  const retryStep = useMutation({
    mutationFn: ({ jobId, stepId }: { jobId: string; stepId: string }) => aiSeoApi.retryWorkspaceStep(jobId, stepId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const cancelJob = useMutation({
    mutationFn: (jobId: string) => aiSeoApi.cancelWorkspaceJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const deleteJob = useMutation({
    mutationFn: (jobId: string) => aiSeoApi.deleteWorkspaceJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const deletePages = useMutation({
    mutationFn: (pageIds: string[]) => Promise.all(pageIds.map((pageId) => aiSeoApi.deleteWorkspacePage(pageId))),
    onSuccess: () => {
      setSelectedPageIds([]);
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
    },
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">אין לך הרשאה לצפות בממשק העבודה.</p>
      </Card>
    );
  }

  function toggleDomain(value: string) {
    setSelectedDomains((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      const rows = domains.filter((d) => next.includes(d.value));
      const terms = rows.flatMap((d) => d.keywords);
      setKeywordsText(Array.from(new Set(terms)).join("\n"));
      return next;
    });
  }

  function toggleOutput(value: string) {
    setOutputTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function confirmDeleteJob(jobId: string) {
    if (window.confirm("למחוק את ה-job? אם הוא עדיין פעיל או בתור, הוא יבוטל אוטומטית לפני המחיקה.")) {
      deleteJob.mutate(jobId);
    }
  }

  function startSelectedJob() {
    setQueueRunning(true);
    setQueueTick((tick) => tick + 1);
  }

  function autoStartQueueIfEnabled(jobId?: string) {
    if (disableAutoRunJobs) return;
    if (jobId) setSelectedJobId(jobId);
    startSelectedJob();
  }

  function togglePreview(pageId: string) {
    setExpandedPreviewIds((prev) => (prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]));
  }

  function togglePageSelection(pageId: string) {
    setSelectedPageIds((prev) => (prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]));
  }

  function toggleResearchSelection(rowId: string) {
    setSelectedResearchIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));
  }

  function addResearchToKeywords(rows: AiSeoResearchRow[]) {
    const existing = splitLines(keywordsText);
    const next = Array.from(new Set([...existing, ...rows.map((row) => row.keyword)]));
    setKeywordsText(next.join("\n"));
  }

  function confirmDeleteSelectedPages() {
    if (!selectedPageIds.length) return;
    if (window.confirm(`למחוק ${selectedPageIds.length} פאנלים/תוצרים מסומנים?`)) {
      deletePages.mutate(selectedPageIds);
    }
  }

  function applyHistoryPreset(preset: AiSeoWorkspaceHistory) {
    setSelectedDomains(preset.domains || []);
    setKeywordsText((preset.keywords || []).join("\n"));
    setOutputTypes((preset.output_types || []).filter(Boolean));
    setPrompt(preset.prompt || "");
    setRecurrenceInterval(preset.recurrence_interval || "");
    setAutoPublishEnabled(Boolean(preset.auto_publish_enabled));
    setRandomTopicsEnabled(Boolean(preset.random_topics_enabled));
    setRandomTopicCount(preset.random_topic_count || 1);
    setLandingDesignEnabled(preset.landing_design_enabled !== false);
    setFreeImageEnabled(preset.free_image_enabled !== false);
    setPublishAt(toLocalInputValue(preset.publish_at || ""));
  }

  useEffect(() => {
    window.localStorage.setItem(DISABLE_AUTO_RUN_STORAGE_KEY, disableAutoRunJobs ? "1" : "0");
  }, [disableAutoRunJobs]);

  useEffect(() => {
    if (queueRunning && !runNextStep.isPending && !runSelectedJob.isPending) {
      if (selectedJobId) {
        runSelectedJob.mutate(selectedJobId);
        return;
      }
      runNextStep.mutate();
    }
  }, [queueRunning, queueTick]);

  const jobs = workspace.data?.jobs ?? [];
  const drafts = workspace.data?.drafts ?? [];
  const history = workspace.data?.history ?? [];
  const researchRows = research.data?.items ?? [];
  const researchCurrentPage = Math.min(researchPage, pageCount(researchRows.length));
  const jobsCurrentPage = Math.min(jobsPage, pageCount(jobs.length));
  const draftsCurrentPage = Math.min(draftsPage, pageCount(drafts.length));
  const pagedResearchRows = pageSlice(researchRows, researchCurrentPage);
  const pagedJobs = pageSlice(jobs, jobsCurrentPage);
  const pagedDrafts = pageSlice(drafts, draftsCurrentPage);
  const selectedResearchRows = researchRows.filter((row) => selectedResearchIds.includes(row.id));
  const selectedResearchDomainValues = Array.from(new Set(selectedResearchRows.map((row) => row.category_value).filter(Boolean)));
  const canScheduleResearchJobs = selectedResearchRows.length > 0 && (selectedDomains.length > 0 || selectedResearchDomainValues.length > 0);
  const geminiReady = workspace.data?.gemini_configured;
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">ממשק עבודה וניהול</h1>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">
            התחלת עבודות ידניות או מתוזמנות: תחומים, מילים, Gemini, בדיקה ואישור לפרודקשן.
          </p>
        </div>
        <Link href="/dashboard/automation">
          <Button type="button" variant="outline">פאנל ג׳ובים</Button>
        </Link>
      </div>

      {!geminiReady && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <p className="font-medium">Gemini לא מוגדר ב-backend.</p>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">הוסף `GEMINI_API_KEY` ב-Railway ובצע Redeploy.</p>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">מחקר SEO</h2>
            <p className="mt-1 text-sm text-[var(--muted-fg)]">
              אסוף צירופי חיפוש פופולריים כרגע מתוך Google Trends/Search Console. מוצגים עד 20 צירופים עם volume אמיתי או ציון Trends יחסי.
            </p>
            {research.data?.last_sync_at && (
              <p className="mt-1 text-xs text-[var(--muted-fg)]">
                סנכרון אחרון: {new Date(research.data.last_sync_at).toLocaleString("he-IL")}
              </p>
            )}
          </div>
          {canManage && (
            <Button type="button" variant="outline" size="sm" disabled={refreshResearch.isPending} onClick={() => refreshResearch.mutate()}>
              {refreshResearch.isPending ? "אוסף מחקר..." : "אסוף מילים פופולריות כרגע"}
            </Button>
          )}
        </div>

        {research.data?.refresh_error && (
          <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-600">
            Google Trends לא החזיר רענון חדש: {research.data.refresh_error}
          </p>
        )}
        {refreshResearch.isError && (
          <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-500">
            רענון מחקר SEO נכשל: {refreshResearch.error instanceof Error ? refreshResearch.error.message : "שגיאה לא ידועה"}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedResearchRows.length === 0}
              onClick={() => addResearchToKeywords(selectedResearchRows)}
            >
              הוסף לרשימת הקטגוריות והצירופים ({selectedResearchRows.length})
            </Button>
            {canManage && (
              <Button
                type="button"
                size="sm"
                disabled={!geminiReady || !canScheduleResearchJobs || scheduleResearchJobs.isPending}
                onClick={() => scheduleResearchJobs.mutate(selectedResearchRows)}
              >
                תזמן ג׳ובים ליצירת עמודי נחיתה ומאמרים
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span>תזמון בעוד</span>
            <select
              className="rounded-md border border-[var(--border)] bg-transparent p-2"
              value={researchScheduleHours}
              onChange={(e) => setResearchScheduleHours(Number(e.target.value))}
            >
              <option value={0}>עכשיו</option>
              <option value={1}>שעה</option>
              <option value={3}>3 שעות</option>
              <option value={6}>6 שעות</option>
              <option value={12}>12 שעות</option>
              <option value={24}>24 שעות</option>
            </select>
          </label>
        </div>
        {!canScheduleResearchJobs && selectedResearchRows.length > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            כדי לתזמן מהמחקר, בחר תחום במסך או בחר צירופים שיש להם category ממופה.
          </p>
        )}

        {research.isLoading ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">טוען מחקר SEO...</p>
        ) : researchRows.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">
            אין עדיין נתוני מחקר. לחץ “אסוף מילים פופולריות כרגע” כדי למשוך נתונים אמיתיים מ-Google Trends.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="grid grid-cols-[44px_1.4fr_120px_1fr_120px] bg-[var(--muted)] px-3 py-2 text-xs font-medium text-[var(--muted-fg)]">
              <span></span>
              <span>צירוף פופולרי</span>
              <span>Volume</span>
              <span>קטגוריה</span>
              <span>מקור</span>
            </div>
            {pagedResearchRows.map((row) => (
              <label
                key={row.id}
                className="grid cursor-pointer grid-cols-[44px_1.4fr_120px_1fr_120px] items-center border-t border-[var(--border)] px-3 py-3 text-sm hover:bg-[var(--muted)]/50"
              >
                <input
                  type="checkbox"
                  checked={selectedResearchIds.includes(row.id)}
                  onChange={() => toggleResearchSelection(row.id)}
                />
                <span className="font-medium">{row.keyword}</span>
                <span>
                  {row.volume === null ? "אין נתון" : row.volume.toLocaleString("he-IL")}
                  <span className="mt-0.5 block text-[10px] text-[var(--muted-fg)]">{row.volume_metric}</span>
                </span>
                <span>{row.category}</span>
                <span className="text-xs text-[var(--muted-fg)]">{row.source}</span>
              </label>
            ))}
          </div>
        )}
        <PaginationControls page={researchCurrentPage} total={researchRows.length} onPageChange={setResearchPage} />
        {research.data?.note && <p className="mt-3 text-xs text-[var(--muted-fg)]">{research.data.note}</p>}
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">בחירה אוטומטית מהיסטוריית ריצות</span>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-transparent p-2"
              value={selectedHistoryId}
              onChange={(e) => {
                const preset = history.find((item) => item.id === e.target.value);
                setSelectedHistoryId(e.target.value);
                if (preset) applyHistoryPreset(preset);
              }}
            >
              <option value="">בחר preset מריצה קודמת...</option>
              {history.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-[var(--muted-fg)]">
            כל אוטומציה שיצרת נשמרת כהיסטוריית בחירה מתוך ה-jobs הקיימים.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="font-semibold">1. בחירת תחומים ומילות מפתח</h2>
          <label className="mt-4 flex items-start gap-2 rounded-lg border border-sky-400/40 bg-sky-500/10 p-3 text-sm">
            <input
              type="checkbox"
              checked={randomTopicsEnabled}
              onChange={(e) => setRandomTopicsEnabled(e.target.checked)}
            />
            <span>
              <span className="block font-medium">בחירת נושאים אקראית לאוטומציה</span>
              <span className="mt-1 block text-xs text-[var(--muted-fg)]">
                אם לא נבחרו תחומים, המערכת תבחר מהקטלוג כולו. אם נבחרו תחומים, האקראיות תהיה מתוך הבחירה.
              </span>
            </span>
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">כמה נושאים אקראיים ליצור בכל batch</span>
            <input
              type="number"
              min={1}
              max={6}
              className="w-full rounded-md border border-[var(--border)] bg-transparent p-2"
              value={randomTopicCount}
              onChange={(e) => setRandomTopicCount(Number(e.target.value) || 1)}
            />
          </label>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((domain) => (
              <label key={domain.value} className="flex cursor-pointer items-center gap-2 rounded border border-[var(--border)] p-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(domain.value)}
                  onChange={() => toggleDomain(domain.value)}
                />
                <span>{domain.label}</span>
              </label>
            ))}
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">מילות מפתח שנבחרו / נוספות</span>
            <textarea
              className="min-h-36 w-full rounded-md border border-[var(--border)] bg-transparent p-3"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
            />
          </label>
        </Card>

        <Card>
          <h2 className="font-semibold">2. סוג תוצרים ותזמון</h2>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={outputTypes.includes("blog")} onChange={() => toggleOutput("blog")} />
              <span>מאמר / בלוג</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={outputTypes.includes("landing_page")}
                onChange={() => toggleOutput("landing_page")}
              />
              <span>דף נחיתה</span>
            </label>
          </div>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">הנחיות ל-Gemini</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-[var(--border)] bg-transparent p-3"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="לדוגמה: להתמקד בלידים לעסקים קטנים, טון מקצועי, CTA ברור..."
            />
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">תזמון אופציונלי</span>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-[var(--border)] bg-transparent p-2"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">תאריך ושעה לפרסום התוצר</span>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-[var(--border)] bg-transparent p-2"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
            <span className="mt-1 block text-xs text-[var(--muted-fg)]">
              אם נבחר תאריך עתידי והעלאה אוטומטית פעילה, הדף יישמר כ-scheduled עד מועד הפרסום.
            </span>
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">ריצה מחזורית</span>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-transparent p-2"
              value={recurrenceInterval}
              onChange={(e) => setRecurrenceInterval(e.target.value)}
            >
              <option value="">חד פעמי</option>
              <option value="hourly">כל שעה</option>
              <option value="every_6_hours">כל 6 שעות</option>
              <option value="every_24_hours">כל 24 שעות</option>
              <option value="every_2_days">כל יומיים</option>
            </select>
          </label>
          <label className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm">
            <input
              type="checkbox"
              checked={autoPublishEnabled}
              onChange={(e) => setAutoPublishEnabled(e.target.checked)}
            />
            <span>
              <span className="block font-medium">העלאה לפרודקשן ללא אישור</span>
              <span className="mt-1 block text-xs text-[var(--muted-fg)]">
                בסיום יצירת הדף/מאמר הוא יפורסם אוטומטית ללא שאלת אישור.
              </span>
            </span>
          </label>
          <div className="mt-4 grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={landingDesignEnabled}
                onChange={(e) => setLandingDesignEnabled(e.target.checked)}
              />
              <span>עיצוב מותאם ואקראי לדפי נחיתה</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={freeImageEnabled}
                onChange={(e) => setFreeImageEnabled(e.target.checked)}
              />
              <span>הוסף תמונת סטוק אקראית עם רישיון פרסום חופשי</span>
            </label>
          </div>
          {canManage && (
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={!geminiReady || generate.isPending || (!randomTopicsEnabled && selectedDomains.length === 0) || outputTypes.length === 0}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? "יוצר batch..." : "Generate via Gemini AI"}
            </Button>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="font-semibold">Batch Jobs</h2>
            <p className="text-xs text-[var(--muted-fg)]">
              בחר שורת job ואז הפעל פעולה. התור מריץ job אחד בכל פעם, שלב אחד בכל pulse.
            </p>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={disableAutoRunJobs}
                onChange={(e) => setDisableAutoRunJobs(e.target.checked)}
              />
              <span>
                <span className="block font-medium">אל תפעיל אוטומטית כל ג&apos;וב</span>
                <span className="mt-1 block text-xs text-[var(--muted-fg)]">
                  כשלא מסומן, ג&apos;ובים חדשים ייכנסו לתור ויתחילו לרוץ אוטומטית לאחר יצירה.
                </span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={runSelectedJob.isPending || runNextStep.isPending || (selectedJob ? selectedJob.status === "completed" || selectedJob.status === "cancelled" : false)}
                  onClick={startSelectedJob}
                >
                  התחל
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!queueRunning}
                  onClick={() => setQueueRunning(false)}
                >
                  עצור
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedJob || selectedJob.status === "completed" || selectedJob.status === "cancelled" || cancelJob.isPending}
                  onClick={() => selectedJob && cancelJob.mutate(selectedJob.id)}
                >
                  בטל
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedJob || deleteJob.isPending}
                  onClick={() => selectedJob && confirmDeleteJob(selectedJob.id)}
                >
                  מחק
                </Button>
              </>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] })}>
              רענן
            </Button>
          </div>
        </div>
        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">אין jobs עדיין.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="grid grid-cols-[44px_1.4fr_1fr_1fr_110px_110px] bg-[var(--muted)] px-3 py-2 text-xs font-medium text-[var(--muted-fg)]">
              <span></span>
              <span>Job</span>
              <span>משתמש</span>
              <span>שלב נוכחי</span>
              <span>התקדמות</span>
              <span>סטטוס</span>
            </div>
            {pagedJobs.map((job) => {
              const isSelected = selectedJobId === job.id;
              const statusTone =
                job.status === "completed"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : job.status === "failed"
                    ? "bg-red-500/15 text-red-500"
                    : job.status === "running"
                      ? "bg-sky-500/15 text-sky-500"
                      : "bg-amber-500/15 text-amber-500";

              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={`grid w-full grid-cols-[44px_1.4fr_1fr_1fr_110px_110px] items-center border-t border-[var(--border)] px-3 py-3 text-start text-sm transition ${
                    isSelected ? "bg-sky-500/10 ring-1 ring-inset ring-sky-500/40" : "hover:bg-[var(--muted)]/60"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${isSelected ? "bg-sky-500" : "bg-[var(--border)]"}`} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{job.name}</span>
                    <span className="block truncate text-xs text-[var(--muted-fg)]">{job.id}</span>
                  </span>
                  <span className="truncate text-xs text-[var(--muted-fg)]">{job.user}</span>
                  <span className="truncate">{job.current_step_name || job.function}</span>
                  <span>
                    <span className="mb-1 block text-xs">{job.progress_percent}%</span>
                    <span className="block h-1.5 rounded-full bg-[var(--border)]">
                      <span className="block h-1.5 rounded-full bg-sky-500" style={{ width: `${job.progress_percent}%` }} />
                    </span>
                  </span>
                  <span className={`w-fit rounded-full px-2 py-1 text-xs ${statusTone}`}>{job.status}</span>
                </button>
              );
            })}
          </div>
        )}
        <PaginationControls page={jobsCurrentPage} total={jobs.length} onPageChange={setJobsPage} />

        {selectedJob && (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <div className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{selectedJob.name}</h3>
                  <p className="text-xs text-[var(--muted-fg)]">שלבים, retry וסטטוס מפורט</p>
                </div>
                <Link href={`/dashboard/automation/${selectedJob.id}`}>
                  <Button type="button" variant="outline" size="sm">פתח ג׳וב</Button>
                </Link>
              </div>
              <ol className="mt-4 grid gap-2 sm:grid-cols-6">
                {(selectedJob.steps.length
                  ? selectedJob.steps
                  : [
                      { id: `${selectedJob.id}-data`, name: "דאטה", status: selectedJob.progress_percent >= 20 ? "completed" : "pending", step_type: "ai_seo.data", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-ai`, name: "AI", status: selectedJob.progress_percent >= 40 ? "completed" : "pending", step_type: "ai_seo.ai", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-design`, name: "עיצוב", status: selectedJob.progress_percent >= 60 ? "completed" : "pending", step_type: "ai_seo.design", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-page`, name: "הקמת דף", status: selectedJob.progress_percent >= 66 ? "completed" : "pending", step_type: "ai_seo.page", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-finish`, name: "סיום", status: selectedJob.progress_percent >= 83 ? "completed" : "pending", step_type: "ai_seo.finish", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-publish`, name: "העלאה לפרודקשן", status: selectedJob.progress_percent >= 100 ? "completed" : "pending", step_type: "ai_seo.publish", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                    ]
                ).map((step) => {
                  const isPublishStep = step.step_type === "ai_seo.publish";
                  return (
                  <li
                    key={step.id}
                    className={`rounded-lg border p-3 text-center text-xs ${
                      step.status === "completed"
                        ? "border-emerald-400/60 bg-emerald-500/10"
                        : step.status === "running"
                          ? "border-sky-400/60 bg-sky-500/10"
                          : step.status === "failed"
                            ? "border-red-400/60 bg-red-500/10"
                            : "border-[var(--border)]"
                    }`}
                  >
                    <p className="font-medium">{step.name}</p>
                    <p className="mt-1 text-[var(--muted-fg)]">{step.status}</p>
                    {isPublishStep && step.status !== "completed" && canPublish && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={publishJob.isPending}
                        onClick={() => publishJob.mutate(selectedJob.id)}
                      >
                        העלאה לפרודקשן
                      </Button>
                    )}
                    {step.retry_count > 0 && <p className="mt-1 text-amber-500">auto retry {step.retry_count}/{step.max_retries}</p>}
                    {step.error_message && <p className="mt-1 text-red-500">{step.error_message}</p>}
                    {step.is_stale && <p className="mt-1 text-amber-500">תקוע מעל זמן ההמתנה</p>}
                    {(step.status === "failed" || step.is_stale) && canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={retryStep.isPending}
                        onClick={() => retryStep.mutate({ jobId: selectedJob.id, stepId: step.id })}
                      >
                        Retry שלב
                      </Button>
                    )}
                    {step.status === "running" && !step.is_stale && !isPublishStep && canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={runSelectedJob.isPending}
                        onClick={() => runSelectedJob.mutate(selectedJob.id)}
                      >
                        הרץ שלב
                      </Button>
                    )}
                  </li>
                  );
                })}
              </ol>
              {selectedJob.error_message && <p className="mt-3 text-sm text-red-500">{selectedJob.error_message}</p>}
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4">
              <h3 className="font-semibold">לוג ריצה</h3>
              {selectedJob.logs.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted-fg)]">אין לוגים עדיין. לחץ “התחל” כדי להריץ את השלב הבא.</p>
              ) : (
                <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
                  {selectedJob.logs.map((log) => (
                    <li key={log.id} className="rounded-lg bg-[var(--muted)] p-2">
                      <span className="font-medium">{log.level}</span>
                      <span className="mx-2 text-[var(--muted-fg)]">·</span>
                      <span>{log.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">אזור טסטים ותוצרים</h2>
            <p className="mt-1 text-xs text-[var(--muted-fg)]">סימולציה נפתחת רק אחרי לחיצה על + הגדל פאנל.</p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedPageIds.length === 0 || deletePages.isPending}
              onClick={confirmDeleteSelectedPages}
            >
              מחק מסומנים ({selectedPageIds.length})
            </Button>
          )}
        </div>
        {drafts.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">בסיום generation יופיעו כאן לינקים לטיוטות.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pagedDrafts.map((page) => {
              const previewExpanded = expandedPreviewIds.includes(page.id);
              return (
              <li key={page.id} className="rounded-lg border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedPageIds.includes(page.id)}
                      onChange={() => togglePageSelection(page.id)}
                      aria-label={`בחר ${page.title} למחיקה`}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold">{page.title}</p>
                      <p className="text-xs text-[var(--muted-fg)]">
                        {page.page_type} · {page.status} · {page.full_path || "ללא path"}
                      </p>
                      {(page.category || page.scheduled_at) && (
                        <p className="mt-1 text-xs text-[var(--muted-fg)]">
                          {page.category ? `קטגוריה: ${page.category.name}` : ""}
                          {page.category && page.scheduled_at ? " · " : ""}
                          {page.scheduled_at ? `מתוזמן לפרסום: ${new Date(page.scheduled_at).toLocaleString("he-IL")}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => togglePreview(page.id)}>
                      {previewExpanded ? "− סגור פאנל" : "+ הגדל פאנל"}
                    </Button>
                    <Link href={page.test_url}>
                      <Button type="button" variant="outline" size="sm">פתח באזור טסט</Button>
                    </Link>
                    {canPublish && page.status !== "published" && (
                      <Button type="button" size="sm" onClick={() => publish.mutate(page)} disabled={publish.isPending}>
                        אשר העלאה לפרודקשן
                      </Button>
                    )}
                  </div>
                </div>
                {previewExpanded && <DraftPreview page={page} />}
                <label className="mt-3 block text-sm">
                  <span className="mb-1 block font-medium">Reject / הערות ליצירה חוזרת</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-[var(--border)] bg-transparent p-2"
                    value={feedbackByPage[page.id] || ""}
                    onChange={(e) => setFeedbackByPage((prev) => ({ ...prev, [page.id]: e.target.value }))}
                    placeholder="כתוב מה לשנות: כותרת, טון, CTA, מבנה, קהל יעד..."
                  />
                </label>
                {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={regenerate.isPending || !(feedbackByPage[page.id] || "").trim()}
                    onClick={() => regenerate.mutate(page)}
                  >
                    בצע יצירה חוזרת עם ההערות
                  </Button>
                )}
              </li>
              );
            })}
          </ul>
        )}
        <PaginationControls page={draftsCurrentPage} total={drafts.length} onPageChange={setDraftsPage} />
      </Card>
    </div>
  );
}
