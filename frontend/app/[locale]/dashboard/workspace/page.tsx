"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  buildEffectivePrompt,
  DOMAIN_ICONS,
  DraftPreview,
  jobStatusLabel,
  jobStatusTone,
  matchesJobTab,
  NEWS_DOMAIN_VALUES,
  pageCount,
  pageSlice,
  PaginationControls,
  splitLines,
  toLocalInputValue,
  type JobTab,
} from "@/components/workspace/workspace-helpers";

const AUTO_RUN_STORAGE_KEY = "ai-seo-auto-run-jobs";
const LEGACY_DISABLE_AUTO_RUN_KEY = "ai-seo-disable-auto-run";

function isRunnableJob(job: Pick<AiSeoWorkspaceJob, "status">): boolean {
  return job.status === "queued" || job.status === "running";
}

function StudioPanel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#12182a]/80 p-5 backdrop-blur-sm ${className}`}>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
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
  const [writingTone, setWritingTone] = useState("בטוח ורציני");
  const [writingStyle, setWritingStyle] = useState("מקצועי ואמין");
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState("");
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [randomTopicsEnabled, setRandomTopicsEnabled] = useState(false);
  const [randomTopicCount, setRandomTopicCount] = useState(2);
  const [newsHotTopicsEnabled, setNewsHotTopicsEnabled] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleEveryMinutes, setScheduleEveryMinutes] = useState(180);
  const [scheduleStartNow, setScheduleStartNow] = useState(true);
  const [scheduleStartAt, setScheduleStartAt] = useState("");
  const [landingDesignEnabled, setLandingDesignEnabled] = useState(true);
  const [freeImageEnabled, setFreeImageEnabled] = useState(true);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedResearchIds, setSelectedResearchIds] = useState<string[]>([]);
  const [researchScheduleHours, setResearchScheduleHours] = useState(1);
  const [researchPage, setResearchPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);
  const [draftsPage, setDraftsPage] = useState(1);
  const [feedbackByPage, setFeedbackByPage] = useState<Record<string, string>>({});
  const [seoSource, setSeoSource] = useState<"trends" | "search_console">("trends");
  const [researchLanguage, setResearchLanguage] = useState<"he" | "en">("he");
  const [researchRegion, setResearchRegion] = useState<"IL" | "US">("IL");
  const [jobTab, setJobTab] = useState<JobTab>("all");
  const [jobSearch, setJobSearch] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoRunJobsEnabled, setAutoRunJobsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUTO_RUN_STORAGE_KEY);
    if (stored !== null) return stored === "1";
    return true;
  });
  const [queueRunning, setQueueRunning] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const queueAutoStartedRef = useRef(false);
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
  const newsDomains = useMemo(() => domains.filter((d) => NEWS_DOMAIN_VALUES.has(d.value)), [domains]);
  const businessDomains = useMemo(() => domains.filter((d) => !NEWS_DOMAIN_VALUES.has(d.value)), [domains]);
  const hasNewsDomainsSelected = useMemo(
    () => selectedDomains.some((value) => NEWS_DOMAIN_VALUES.has(value)),
    [selectedDomains],
  );
  const effectivePrompt = useMemo(
    () => buildEffectivePrompt(prompt, writingTone, writingStyle),
    [prompt, writingTone, writingStyle],
  );

  const generate = useMutation({
    mutationFn: () =>
      aiSeoApi.generateWorkspaceBatch({
        domains: selectedDomains,
        keywords: splitLines(keywordsText),
        output_types: outputTypes,
        prompt: effectivePrompt,
        scheduled_at:
          scheduleEnabled && !scheduleStartNow && scheduleStartAt
            ? new Date(scheduleStartAt).toISOString()
            : undefined,
        publish_at: publishAt ? new Date(publishAt).toISOString() : undefined,
        recurrence_interval: recurrenceInterval || undefined,
        recurrence_minutes: scheduleEnabled ? scheduleEveryMinutes : undefined,
        auto_publish_enabled: autoPublishEnabled,
        random_topics_enabled: randomTopicsEnabled,
        random_topic_count: randomTopicCount,
        news_hot_topics_enabled: newsHotTopicsEnabled,
        landing_design_enabled: landingDesignEnabled,
        free_image_enabled: freeImageEnabled,
        locale: "he",
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      if (data.jobs.some(isRunnableJob)) {
        queueAutoStartedRef.current = false;
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
        prompt: effectivePrompt || "Generate from SEO research selected phrases.",
        scheduled_at: scheduleDate.toISOString(),
        auto_publish_enabled: autoPublishEnabled,
        locale: "he",
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      setSelectedResearchIds([]);
      if (data.jobs.some(isRunnableJob)) {
        queueAutoStartedRef.current = false;
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
        queueAutoStartedRef.current = false;
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

  function toggleDomain(value: string) {
    setSelectedDomains((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      const rows = domains.filter((d) => next.includes(d.value));
      const terms = rows.flatMap((d) => d.keywords);
      setKeywordsText(Array.from(new Set(terms)).join("\n"));
      return next;
    });
  }

  function toggleAllDomains() {
    if (selectedDomains.length === domains.length) {
      setSelectedDomains([]);
      setKeywordsText("");
      return;
    }
    setSelectedDomains(domains.map((d) => d.value));
    setKeywordsText(Array.from(new Set(domains.flatMap((d) => d.keywords))).join("\n"));
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
    if (!autoRunJobsEnabled) return;
    if (jobId) setSelectedJobId(jobId);
    startSelectedJob();
  }

  function handleAutoRunToggle(enabled: boolean) {
    setAutoRunJobsEnabled(enabled);
    if (enabled) {
      queueAutoStartedRef.current = false;
      const hasRunnable = (workspace.data?.jobs ?? []).some(isRunnableJob);
      if (hasRunnable) startSelectedJob();
      return;
    }
    setQueueRunning(false);
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
    window.localStorage.setItem(AUTO_RUN_STORAGE_KEY, autoRunJobsEnabled ? "1" : "0");
    window.localStorage.removeItem(LEGACY_DISABLE_AUTO_RUN_KEY);
  }, [autoRunJobsEnabled]);

  useEffect(() => {
    if (!canManage || !autoRunJobsEnabled || queueRunning || queueAutoStartedRef.current) return;
    const hasRunnable = (workspace.data?.jobs ?? []).some(isRunnableJob);
    if (!hasRunnable) return;
    queueAutoStartedRef.current = true;
    startSelectedJob();
  }, [workspace.data?.jobs, autoRunJobsEnabled, canManage, queueRunning]);

  useEffect(() => {
    if (queueRunning && !runNextStep.isPending && !runSelectedJob.isPending) {
      if (selectedJobId) {
        runSelectedJob.mutate(selectedJobId);
        return;
      }
      runNextStep.mutate();
    }
  }, [queueRunning, queueTick]);

  useEffect(() => {
    setResearchPage(1);
  }, [seoSource]);

  useEffect(() => {
    setJobsPage(1);
  }, [jobTab, jobSearch]);

  useEffect(() => {
    if (newsHotTopicsEnabled) {
      setOutputTypes(["blog", "landing_page"]);
    }
  }, [newsHotTopicsEnabled]);

  if (!canView) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#12182a] p-6 text-sm text-slate-400">
        אין לך הרשאה לצפות בממשק העבודה.
      </div>
    );
  }

  const jobs = workspace.data?.jobs ?? [];
  const drafts = workspace.data?.drafts ?? [];
  const history = workspace.data?.history ?? [];
  const researchRows = research.data?.items ?? [];
  const sourceFilteredResearch = researchRows.filter((row) =>
    seoSource === "trends" ? row.source === "google_trends" : row.source === "search_console",
  );
  const filteredJobs = jobs.filter((job) => {
    if (!matchesJobTab(job.status, jobTab)) return false;
    const q = jobSearch.trim().toLowerCase();
    if (!q) return true;
    return [job.name, job.user, job.id, job.current_step_name].some((part) => part.toLowerCase().includes(q));
  });
  const researchCurrentPage = Math.min(researchPage, pageCount(sourceFilteredResearch.length));
  const jobsCurrentPage = Math.min(jobsPage, pageCount(filteredJobs.length));
  const draftsCurrentPage = Math.min(draftsPage, pageCount(drafts.length));
  const pagedResearchRows = pageSlice(sourceFilteredResearch, researchCurrentPage);
  const pagedJobs = pageSlice(filteredJobs, jobsCurrentPage);
  const pagedDrafts = pageSlice(drafts, draftsCurrentPage);
  const selectedResearchRows = researchRows.filter((row) => selectedResearchIds.includes(row.id));
  const selectedResearchDomainValues = Array.from(new Set(selectedResearchRows.map((row) => row.category_value).filter(Boolean)));
  const canScheduleResearchJobs = selectedResearchRows.length > 0 && (selectedDomains.length > 0 || selectedResearchDomainValues.length > 0);
  const geminiReady = workspace.data?.gemini_configured;
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const allDomainsSelected = domains.length > 0 && selectedDomains.length === domains.length;
  const canStartGeneration =
    randomTopicsEnabled || newsHotTopicsEnabled || selectedDomains.length > 0;
  const inputClass = "w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500/50";
  const selectClass = inputClass;

  const STEPS = [
    { id: 1, label: "מחקר ומילות מפתח", active: true },
    { id: 2, label: "יצירת סקיצה", active: false },
    { id: 3, label: "יצירת תוכן", active: false },
    { id: 4, label: "פרסום ומעקב", active: false },
  ];

  return (
    <div className="workspace-studio -m-6 min-h-full bg-[#080c16] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-violet-300">
              ← חזרה לדשבורד
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">ממשק עבודה וניהול</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              מחולל תוכן חכם ומתקדם עם AI, מחקר ומעקב טרנדים בזמן אמת
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGuide((v) => !v)}
              className="border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
            >
              מדריך מהיר
            </Button>
            <Link href="/dashboard/automation">
              <Button type="button" variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200">
                פאנל ג׳ובים
              </Button>
            </Link>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step.active ? "bg-violet-600 text-white" : "border border-white/15 bg-white/5 text-slate-400"
                }`}
              >
                {step.id}
              </div>
              <span className={`text-sm ${step.active ? "font-medium text-white" : "text-slate-500"}`}>{step.label}</span>
              {index < STEPS.length - 1 && <span className="hidden text-slate-600 sm:inline">—</span>}
            </div>
          ))}
        </div>

        {showGuide && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-slate-200">
            <p className="font-medium">זרימת עבודה</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-slate-300">
              <li>בחר תחומים ומילות מפתח, או הרץ מחקר SEO</li>
              <li>הגדר סוג תוכן והנחיות ל-Gemini</li>
              <li>לחץ Generate — ה-jobs ירוצו אוטומטית (אם מסומן)</li>
              <li>אשר פרסום מתוך טיוטות או שלב העלאה לפרודקשן</li>
            </ol>
          </div>
        )}

        {!geminiReady && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-medium text-amber-200">Gemini לא מוגדר ב-backend.</p>
            <p className="mt-1 text-sm text-amber-100/80">הוסף `GEMINI_API_KEY` ב-Railway ובצע Redeploy.</p>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
          {/* Left column */}
          <div className="space-y-5">
            <StudioPanel title="מקור SEO">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSeoSource("trends")}
                  className={`rounded-xl border p-4 text-start transition ${
                    seoSource === "trends"
                      ? "border-violet-500 bg-violet-500/15 ring-1 ring-violet-500/40"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Google Trends</span>
                    <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] text-white">מומלץ</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">טרנדים, related queries, נפח יחסי</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSeoSource("search_console")}
                  className={`rounded-xl border p-4 text-start transition ${
                    seoSource === "search_console"
                      ? "border-violet-500 bg-violet-500/15 ring-1 ring-violet-500/40"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <span className="font-medium">Search Console</span>
                  <p className="mt-1 text-xs text-slate-400">שאילתות אמיתיות + impressions</p>
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="mb-1 block text-slate-400">שפת חיפוש</span>
                  <select className={selectClass} value={researchLanguage} onChange={(e) => setResearchLanguage(e.target.value as "he" | "en")}>
                    <option value="he">עברית</option>
                    <option value="en">אנגלית</option>
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-slate-400">אזור</span>
                  <select className={selectClass} value={researchRegion} onChange={(e) => setResearchRegion(e.target.value as "IL" | "US")}>
                    <option value="IL">ישראל</option>
                    <option value="US">ארה״ב</option>
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-slate-400">טווח זמן</span>
                  <select className={selectClass} defaultValue="24h" title="ברירת מחדל בשרת: 24 שעות">
                    <option value="24h">24 שעות</option>
                    <option value="7d">7 ימים</option>
                    <option value="30d">30 ימים</option>
                  </select>
                </label>
              </div>
              {canManage && (
                <Button
                  type="button"
                  className="mt-4 w-full bg-violet-600 hover:bg-violet-500"
                  disabled={refreshResearch.isPending}
                  onClick={() => refreshResearch.mutate()}
                >
                  {refreshResearch.isPending ? "מריץ מחקר..." : "הפעל מחקר"}
                </Button>
              )}
              <p className="mt-2 text-xs text-emerald-400">
                ✓ נתונים מ-{seoSource === "trends" ? "Google Trends" : "Search Console"}
                {research.data?.last_sync_at && ` · ${new Date(research.data.last_sync_at).toLocaleString("he-IL")}`}
              </p>
              {(research.data?.refresh_error || refreshResearch.isError) && (
                <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                  {research.data?.refresh_error || (refreshResearch.error instanceof Error ? refreshResearch.error.message : "שגיאת מחקר")}
                </p>
              )}
            </StudioPanel>

            <StudioPanel title="סוג תוכן והגדרות">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">הנחיות ל-Gemini</span>
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="לדוגמה: להתמקד בלידים לעסקים קטנים, טון מקצועי, CTA ברור..."
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-400">רמת כתיבה</span>
                  <select className={selectClass} value={writingTone} onChange={(e) => setWritingTone(e.target.value)}>
                    <option>בטוח ורציני</option>
                    <option>ידידותי ונגיש</option>
                    <option>מומחה וטכני</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-400">סגנון וכתיבה</span>
                  <select className={selectClass} value={writingStyle} onChange={(e) => setWritingStyle(e.target.value)}>
                    <option>מקצועי ואמין</option>
                    <option>שיווקי ומשכנע</option>
                    <option>עיתונאי וניטרלי</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                className="mt-3 text-xs text-violet-300 hover:underline"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "הסתר הגדרות מתקדמות" : "הגדרות מתקדמות (תמונות, פרסום, היסטוריה)"}
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <label className="block">
                    <span className="mb-1 block text-slate-400">תאריך פרסום</span>
                    <input type="datetime-local" className={inputClass} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={landingDesignEnabled} onChange={(e) => setLandingDesignEnabled(e.target.checked)} />
                    <span>עיצוב אקראי לדפי נחיתה</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={freeImageEnabled} onChange={(e) => setFreeImageEnabled(e.target.checked)} />
                    <span>תמונת סטוק חופשית</span>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-slate-400">היסטוריית ריצות</span>
                    <select
                      className={selectClass}
                      value={selectedHistoryId}
                      onChange={(e) => {
                        const preset = history.find((item) => item.id === e.target.value);
                        setSelectedHistoryId(e.target.value);
                        if (preset) applyHistoryPreset(preset);
                      }}
                    >
                      <option value="">בחר preset...</option>
                      {history.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </StudioPanel>

            <StudioPanel title="תזמון עבודות">
              <div className="space-y-3 text-sm">
                <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={randomTopicsEnabled}
                    onChange={(e) => setRandomTopicsEnabled(e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-white">בחירה לפי נושאים חמים אקראית</span>
                    <span className="mt-1 block text-xs text-slate-400">בוחר תחומים ומילות מפתח טרנדיות מהקטלוג בכל ריצה</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={newsHotTopicsEnabled}
                    onChange={(e) => setNewsHotTopicsEnabled(e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-amber-100">עניין חדשותי — אירוע חם מ-24 שעות</span>
                    <span className="mt-1 block text-xs text-amber-100/80">
                      לוקח נושא חדשותי טרנדי ויוצר מאמר בלוג ודף נחיתה קשורים (מומלץ: שניהם)
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={autoPublishEnabled}
                    onChange={(e) => setAutoPublishEnabled(e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-white">תעלה ללא אישור אוטומטית</span>
                    <span className="mt-1 block text-xs text-slate-400">פרסום ישיר לפרודקשן בסיום היצירה</span>
                  </span>
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} />
                  הפעל תזמון מחזורי
                </label>
                {scheduleEnabled && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1 block text-slate-300">כל כמה דקות</span>
                      <input
                        type="number"
                        min={3}
                        max={10080}
                        className={inputClass}
                        value={scheduleEveryMinutes}
                        onChange={(e) => setScheduleEveryMinutes(Math.max(3, Number(e.target.value) || 3))}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input
                        type="radio"
                        name="schedule-start"
                        checked={scheduleStartNow}
                        onChange={() => setScheduleStartNow(true)}
                      />
                      התחל עכשיו
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="schedule-start"
                        checked={!scheduleStartNow}
                        onChange={() => setScheduleStartNow(false)}
                      />
                      התחל בשעה
                    </label>
                    {!scheduleStartNow && (
                      <input
                        type="datetime-local"
                        className={inputClass}
                        value={scheduleStartAt}
                        onChange={(e) => setScheduleStartAt(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-300">סוג תוצר</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outputTypes.includes("blog")}
                      onChange={() => toggleOutput("blog")}
                      disabled={newsHotTopicsEnabled}
                    />
                    <span>בלוג / מאמר</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outputTypes.includes("landing_page")}
                      onChange={() => toggleOutput("landing_page")}
                      disabled={newsHotTopicsEnabled}
                    />
                    <span>דף נחיתה</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outputTypes.includes("blog") && outputTypes.includes("landing_page")}
                      onChange={() => setOutputTypes(["blog", "landing_page"])}
                      disabled={newsHotTopicsEnabled}
                    />
                    <span>שניהם</span>
                  </label>
                </div>
              </div>

              {randomTopicsEnabled && (
                <label className="mt-3 block text-sm">
                  <span className="mb-1 block text-slate-400">כמה נושאים אקראיים בכל batch</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    className={inputClass}
                    value={randomTopicCount}
                    onChange={(e) => setRandomTopicCount(Number(e.target.value) || 1)}
                  />
                </label>
              )}

              {canManage && (
                <Button
                  type="button"
                  className="mt-5 w-full bg-gradient-to-r from-violet-600 to-indigo-600 py-6 text-base font-semibold hover:from-violet-500 hover:to-indigo-500"
                  disabled={
                    !geminiReady ||
                    generate.isPending ||
                    !canStartGeneration ||
                    outputTypes.length === 0 ||
                    (scheduleEnabled && scheduleEveryMinutes < 3) ||
                    (scheduleEnabled && !scheduleStartNow && !scheduleStartAt)
                  }
                  onClick={() => generate.mutate()}
                >
                  {generate.isPending ? "יוצר batch..." : "✨ Generate via Gemini AI"}
                </Button>
              )}
            </StudioPanel>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <StudioPanel title="בחירת תחומים ומילות מפתח">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {businessDomains.map((domain) => {
                  const selected = selectedDomains.includes(domain.value);
                  return (
                    <button
                      key={domain.value}
                      type="button"
                      onClick={() => toggleDomain(domain.value)}
                      className={`rounded-xl border p-3 text-start text-sm transition ${
                        selected
                          ? "border-violet-500 bg-violet-500/20 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      <span className="text-lg">{DOMAIN_ICONS[domain.value] || "📌"}</span>
                      <span className="mt-1 block font-medium">{domain.label}</span>
                    </button>
                  );
                })}
              </div>
              {newsDomains.length > 0 && (
                <>
                  <p className="mt-4 text-sm font-medium text-amber-200">חדשות מהיום</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {newsDomains.map((domain) => {
                      const selected = selectedDomains.includes(domain.value);
                      return (
                        <button
                          key={domain.value}
                          type="button"
                          onClick={() => toggleDomain(domain.value)}
                          className={`rounded-xl border p-3 text-start text-sm transition ${
                            selected
                              ? "border-amber-400 bg-amber-500/20 text-white"
                              : "border-amber-500/20 bg-amber-500/5 text-slate-300"
                          }`}
                        >
                          <span className="text-lg">{DOMAIN_ICONS[domain.value] || "📰"}</span>
                          <span className="mt-1 block font-medium">{domain.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {hasNewsDomainsSelected && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-100">
                  Gemini ייקח אירוע חדשותי טרנדי ויבנה מאמר או דף נחיתה סביבו.
                </p>
              )}
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-slate-400">מילות מפתח (פסיק או שורה חדשה)</span>
                <textarea className={`${inputClass} min-h-28`} value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} />
              </label>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={allDomainsSelected} onChange={toggleAllDomains} />
                  <span>בחר הכל</span>
                </label>
                <span className="text-slate-400">{selectedDomains.length} תחומים נבחרו</span>
              </div>
            </StudioPanel>

            <StudioPanel title="מה כולל המחקר?">
              <ul className="space-y-2 text-sm text-slate-300">
                {["זיהוי טרנדים עדכניים", "מילות מפתח בנפח גבוה", "ניתוח כוונת חיפוש", "הצעות כותרות ו-meta"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-200">ניתוח מתחרים</span>
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">User Intent</span>
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">כותרות / Meta</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">⏱ הערכת זמן: 5–10 דקות</p>
            </StudioPanel>
          </div>
        </div>

        {/* Research results */}
        <StudioPanel title="תוצאות מחקר SEO">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              מציג {seoSource === "trends" ? "Trends" : "Search Console"} · {sourceFilteredResearch.length} צירופים
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedResearchRows.length === 0}
                onClick={() => addResearchToKeywords(selectedResearchRows)}
                className="border-white/10 bg-white/5 text-slate-200"
              >
                הוסף למילות מפתח ({selectedResearchRows.length})
              </Button>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!geminiReady || !canScheduleResearchJobs || scheduleResearchJobs.isPending}
                  onClick={() => scheduleResearchJobs.mutate(selectedResearchRows)}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  תזמן ג׳ובים מהמחקר
                </Button>
              )}
              <select
                className="rounded-lg border border-white/10 bg-[#0b1020] px-2 py-1 text-xs text-slate-200"
                value={researchScheduleHours}
                onChange={(e) => setResearchScheduleHours(Number(e.target.value))}
              >
                <option value={0}>עכשיו</option>
                <option value={1}>בעוד שעה</option>
                <option value={6}>בעוד 6 שעות</option>
                <option value={24}>בעוד 24 שעות</option>
              </select>
            </div>
          </div>
          {research.isLoading ? (
            <p className="mt-4 text-sm text-slate-400">טוען מחקר...</p>
          ) : sourceFilteredResearch.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              אין נתונים למקור הנבחר. לחץ «הפעל מחקר» או חבר אינטגרציות ב-
              <Link href="/dashboard/settings/integrations/google" className="text-violet-300 hover:underline">
                הגדרות Google
              </Link>
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-[40px_1.4fr_100px_1fr_100px] bg-white/5 px-3 py-2 text-xs font-medium text-slate-400">
                <span />
                <span>צירוף</span>
                <span>Volume</span>
                <span>קטגוריה</span>
                <span>מקור</span>
              </div>
              {pagedResearchRows.map((row) => (
                <label
                  key={row.id}
                  className="grid cursor-pointer grid-cols-[40px_1.4fr_100px_1fr_100px] items-center border-t border-white/10 px-3 py-3 text-sm hover:bg-white/5"
                >
                  <input type="checkbox" checked={selectedResearchIds.includes(row.id)} onChange={() => toggleResearchSelection(row.id)} />
                  <span className="font-medium text-white">{row.keyword}</span>
                  <span className="text-slate-300">
                    {row.volume === null ? "—" : row.volume.toLocaleString("he-IL")}
                  </span>
                  <span className="text-slate-400">{row.category}</span>
                  <span className="text-xs text-slate-500">{row.source}</span>
                </label>
              ))}
            </div>
          )}
          <PaginationControls page={researchCurrentPage} total={sourceFilteredResearch.length} onPageChange={setResearchPage} />
        </StudioPanel>

        {/* Batch Jobs */}
        <StudioPanel title="Batch Jobs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              placeholder="חיפוש משימות..."
              className="max-w-xs rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-200"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {([
                ["all", "הכל"],
                ["active", "פעיל"],
                ["waiting", "ממתין"],
                ["completed", "הושלם"],
                ["failed", "נכשל"],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setJobTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    jobTab === tab ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={autoRunJobsEnabled} onChange={(e) => handleAutoRunToggle(e.target.checked)} />
            <span>
              <span className="font-medium">הפעל אוטומטית ג׳ובים בתור</span>
              {autoRunJobsEnabled && queueRunning && <span className="mt-1 block text-xs text-emerald-400">התור רץ כעת</span>}
            </span>
          </label>
          {canManage && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={runSelectedJob.isPending || runNextStep.isPending} onClick={startSelectedJob} className="bg-violet-600">
                התחל
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!queueRunning} onClick={() => setQueueRunning(false)} className="border-white/10 bg-white/5">
                עצור
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!selectedJob || cancelJob.isPending} onClick={() => selectedJob && cancelJob.mutate(selectedJob.id)} className="border-white/10 bg-white/5">
                בטל
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!selectedJob || deleteJob.isPending} onClick={() => selectedJob && confirmDeleteJob(selectedJob.id)} className="border-white/10 bg-white/5">
                מחק
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] })} className="border-white/10 bg-white/5">
                רענן
              </Button>
            </div>
          )}
          {filteredJobs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">אין jobs בטאב זה.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr_1fr_0.8fr_0.8fr] bg-white/5 px-3 py-2 text-xs font-medium text-slate-400">
                  <span>משימה</span>
                  <span>סוג תוכן</span>
                  <span>נושאים</span>
                  <span>סטטוס</span>
                  <span>התקדמות</span>
                  <span>נוצר</span>
                  <span>פעולות</span>
                </div>
                {pagedJobs.map((job) => {
                  const isSelected = selectedJobId === job.id;
                  const config = job.config || {};
                  const outputType = typeof config.output_type === "string" ? config.output_type : job.job_type;
                  const domainCount = Array.isArray(config.source_domain_values)
                    ? config.source_domain_values.length
                    : config.domain
                      ? 1
                      : 0;
                  return (
                    <div
                      key={job.id}
                      className={`grid grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr_1fr_0.8fr_0.8fr] items-center border-t border-white/10 px-3 py-3 text-sm ${
                        isSelected ? "bg-violet-500/10" : "hover:bg-white/5"
                      }`}
                    >
                      <button type="button" className="text-start" onClick={() => setSelectedJobId(job.id)}>
                        <span className="block truncate font-medium text-white">{job.name}</span>
                        <span className="block truncate text-xs text-slate-500">{job.user}</span>
                      </button>
                      <span className="text-slate-300">{outputType.includes("landing") ? "דף נחיתה" : "מאמר"}</span>
                      <span className="text-slate-400">{domainCount ? `${domainCount} תחומים` : "—"}</span>
                      <span className={`w-fit rounded-full border px-2 py-0.5 text-xs ${jobStatusTone(job.status)}`}>
                        {jobStatusLabel(job.status)}
                      </span>
                      <div>
                        <span className="text-xs text-slate-400">{job.progress_percent}%</span>
                        <span className="mt-1 block h-1.5 rounded-full bg-white/10">
                          <span className="block h-1.5 rounded-full bg-violet-500" style={{ width: `${job.progress_percent}%` }} />
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {job.created_at ? new Date(job.created_at).toLocaleString("he-IL") : "—"}
                      </span>
                      <div className="flex gap-1">
                        {canManage && isRunnableJob(job) && (
                          <button type="button" className="rounded p-1 hover:bg-white/10" title="הרץ" onClick={() => { setSelectedJobId(job.id); startSelectedJob(); }}>
                            ▶
                          </button>
                        )}
                        {canManage && (
                          <button type="button" className="rounded p-1 hover:bg-white/10" title="מחק" onClick={() => confirmDeleteJob(job.id)}>
                            🗑
                          </button>
                        )}
                        <Link href={`/dashboard/automation/${job.id}`} className="rounded p-1 hover:bg-white/10" title="פרטים">
                          ⋯
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <PaginationControls page={jobsCurrentPage} total={filteredJobs.length} onPageChange={setJobsPage} />

          {selectedJob && (
            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{selectedJob.name}</h3>
                    <p className="text-xs text-slate-400">שלבים, retry וסטטוס</p>
                  </div>
                  <Link href={`/dashboard/automation/${selectedJob.id}`}>
                    <Button type="button" variant="outline" size="sm" className="border-white/10 bg-white/5">פתח ג׳וב</Button>
                  </Link>
                </div>
                <ol className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {(selectedJob.steps.length ? selectedJob.steps : []).map((step) => {
                    const isPublishStep = step.step_type === "ai_seo.publish";
                    return (
                      <li
                        key={step.id}
                        className={`rounded-lg border p-2 text-center text-xs ${
                          step.status === "completed"
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : step.status === "running"
                              ? "border-sky-500/40 bg-sky-500/10"
                              : step.status === "failed"
                                ? "border-red-500/40 bg-red-500/10"
                                : "border-white/10"
                        }`}
                      >
                        <p className="font-medium text-white">{step.name}</p>
                        <p className="mt-1 text-slate-400">{step.status}</p>
                        {isPublishStep && step.status !== "completed" && canPublish && (
                          <Button type="button" variant="outline" size="sm" className="mt-2 border-white/10" disabled={publishJob.isPending} onClick={() => publishJob.mutate(selectedJob.id)}>
                            פרסם
                          </Button>
                        )}
                        {(step.status === "failed" || step.is_stale) && canManage && (
                          <Button type="button" variant="outline" size="sm" className="mt-2 border-white/10" disabled={retryStep.isPending} onClick={() => retryStep.mutate({ jobId: selectedJob.id, stepId: step.id })}>
                            Retry
                          </Button>
                        )}
                        {step.error_message && <p className="mt-1 text-red-400">{step.error_message}</p>}
                      </li>
                    );
                  })}
                </ol>
                {selectedJob.error_message && <p className="mt-3 text-sm text-red-400">{selectedJob.error_message}</p>}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-white">לוג ריצה</h3>
                {selectedJob.logs.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">אין לוגים עדיין.</p>
                ) : (
                  <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
                    {selectedJob.logs.map((log) => (
                      <li key={log.id} className="rounded-lg bg-white/5 p-2 text-slate-300">
                        <span className="font-medium text-violet-300">{log.level}</span> · {log.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </StudioPanel>

        {/* Drafts */}
        <StudioPanel title="אזור טסטים ותוצרים">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">טיוטות, preview, אישור פרסום ויצירה חוזרת</p>
            {canManage && (
              <Button type="button" variant="outline" size="sm" disabled={selectedPageIds.length === 0 || deletePages.isPending} onClick={confirmDeleteSelectedPages} className="border-white/10 bg-white/5">
                מחק מסומנים ({selectedPageIds.length})
              </Button>
            )}
          </div>
          {drafts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">בסיום generation יופיעו כאן טיוטות.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {pagedDrafts.map((page) => {
                const previewExpanded = expandedPreviewIds.includes(page.id);
                return (
                  <li key={page.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={selectedPageIds.includes(page.id)} onChange={() => togglePageSelection(page.id)} />
                        <div>
                          <p className="font-semibold text-white">{page.title}</p>
                          <p className="text-xs text-slate-400">{page.page_type} · {page.status} · {page.full_path || "ללא path"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => togglePreview(page.id)} className="border-white/10 bg-white/5">
                          {previewExpanded ? "− סגור" : "+ תצוגה"}
                        </Button>
                        <Link href={page.test_url}>
                          <Button type="button" variant="outline" size="sm" className="border-white/10 bg-white/5">אזור טסט</Button>
                        </Link>
                        {canPublish && page.status !== "published" && (
                          <Button type="button" size="sm" className="bg-violet-600" onClick={() => publish.mutate(page)} disabled={publish.isPending}>
                            אשר פרסום
                          </Button>
                        )}
                      </div>
                    </div>
                    {previewExpanded && <DraftPreview page={page} />}
                    <label className="mt-3 block text-sm">
                      <span className="mb-1 block text-slate-400">הערות ליצירה חוזרת</span>
                      <textarea
                        className={`${inputClass} min-h-20`}
                        value={feedbackByPage[page.id] || ""}
                        onChange={(e) => setFeedbackByPage((prev) => ({ ...prev, [page.id]: e.target.value }))}
                      />
                    </label>
                    {canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-white/10 bg-white/5"
                        disabled={regenerate.isPending || !(feedbackByPage[page.id] || "").trim()}
                        onClick={() => regenerate.mutate(page)}
                      >
                        יצירה חוזרת
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <PaginationControls page={draftsCurrentPage} total={drafts.length} onPageChange={setDraftsPage} />
        </StudioPanel>
      </div>
    </div>
  );
}
