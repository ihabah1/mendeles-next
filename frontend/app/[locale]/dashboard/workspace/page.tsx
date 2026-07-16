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
  jobNextRunLabel,
  jobStatusLabel,
  jobStatusTone,
  matchesJobTab,
  NEWS_DOMAIN_VALUES,
  pageCount,
  pageLocale,
  pageSlice,
  PaginationControls,
  splitLines,
  toLocalInputValue,
  type JobTab,
} from "@/components/workspace/workspace-helpers";
import {
  DomainTile,
  ModeSegment,
  OptionCard,
  OutputPill,
  StudioPanel,
} from "@/components/workspace/workspace-studio-ui";
import { KeywordChipField } from "@/components/workspace/keyword-chip-field";
import { ActiveAutomationBanner } from "@/components/workspace/active-automation-banner";

const AUTO_RUN_STORAGE_KEY = "ai-seo-auto-run-jobs";
const LEGACY_DISABLE_AUTO_RUN_KEY = "ai-seo-disable-auto-run";

function isRunnableJob(job: Pick<AiSeoWorkspaceJob, "status">): boolean {
  return job.status === "queued" || job.status === "running";
}

export default function WorkspacePage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("ai_seo.view");
  const canManage = hasPermission("ai_seo.manage");
  const canPublish = hasPermission("content.publish");
  const qc = useQueryClient();
  const automationBannerRef = useRef<HTMLDivElement>(null);

  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [keywordsText, setKeywordsText] = useState("");
  const [outputTypes, setOutputTypes] = useState<string[]>(["blog", "landing_page"]);
  const [prompt, setPrompt] = useState("");
  const [writingTone, setWritingTone] = useState("בטוח ורציני");
  const [writingStyle, setWritingStyle] = useState("מקצועי ואמין");
  const [runMode, setRunMode] = useState<"now" | "automation">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState("");
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [randomTopicsEnabled, setRandomTopicsEnabled] = useState(false);
  const [randomTopicCount, setRandomTopicCount] = useState(2);
  const [newsHotTopicsEnabled, setNewsHotTopicsEnabled] = useState(false);
  const [internationalNewsTranslationEnabled, setInternationalNewsTranslationEnabled] = useState(false);
  const [contentLocales, setContentLocales] = useState<"both" | "he" | "en" | "ar">("both");
  const [sportsTranslationEnabled, setSportsTranslationEnabled] = useState(false);
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
  const [generateFeedback, setGenerateFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [autoRunJobsEnabled, setAutoRunJobsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUTO_RUN_STORAGE_KEY);
    if (stored !== null) return stored === "1";
    return true;
  });
  const [queueRunning, setQueueRunning] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const queueAutoStartedRef = useRef(false);
  const queueRunModeRef = useRef<"queue" | "selected" | "checked">("queue");
  const queueTargetIdsRef = useRef<string[]>([]);
  const queueTargetIndexRef = useRef(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
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
  const hasSportsSelected = useMemo(() => selectedDomains.includes("sports"), [selectedDomains]);
  const hasNewsDomainsSelected = useMemo(
    () => selectedDomains.some((value) => NEWS_DOMAIN_VALUES.has(value)),
    [selectedDomains],
  );
  const effectivePrompt = useMemo(
    () => buildEffectivePrompt(prompt, writingTone, writingStyle),
    [prompt, writingTone, writingStyle],
  );

  const generate = useMutation({
    mutationFn: (mode: "now" | "automation" = runMode) =>
      aiSeoApi.generateWorkspaceBatch({
        domains: selectedDomains,
        keywords: splitLines(keywordsText),
        output_types: outputTypes,
        prompt: effectivePrompt,
        scheduled_at:
          mode === "automation" && !scheduleStartNow && scheduleStartAt
            ? new Date(scheduleStartAt).toISOString()
            : undefined,
        publish_at: publishAt ? new Date(publishAt).toISOString() : undefined,
        recurrence_interval: mode === "automation" ? recurrenceInterval || undefined : undefined,
        recurrence_minutes: mode === "automation" ? scheduleEveryMinutes : undefined,
        auto_publish_enabled: autoPublishEnabled,
        random_topics_enabled: randomTopicsEnabled,
        random_topic_count: randomTopicCount,
        news_hot_topics_enabled: newsHotTopicsEnabled,
        international_news_translation_enabled: internationalNewsTranslationEnabled,
        landing_design_enabled: landingDesignEnabled,
        free_image_enabled: freeImageEnabled,
        content_locales: contentLocales,
        sports_translation_enabled: sportsTranslationEnabled,
      }),
    onSuccess: (data, mode) => {
      qc.setQueryData(["ai-seo-workspace"], data.workspace);
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      const jobCount = data.jobs.length;
      setGenerateFeedback({
        tone: "success",
        message:
          mode === "automation"
            ? `אוטומציה חוזרת הופעלה — ${jobCount} משימות בתור${scheduleStartNow ? "" : `, ריצה ראשונה ב-${new Date(scheduleStartAt).toLocaleString("he-IL")}`}.`
            : `נוצרו ${jobCount} משימות יצירה.`,
      });
      if (mode === "automation") {
        setRunMode("automation");
        setScheduleEnabled(true);
        window.requestAnimationFrame(() => {
          automationBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      if (data.jobs.some(isRunnableJob)) {
        queueAutoStartedRef.current = false;
        autoStartQueueIfEnabled();
      }
    },
    onError: (error) => {
      setGenerateFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "הפעלת האוטומציה נכשלה. נסו שוב.",
      });
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
        content_locales: contentLocales,
        sports_translation_enabled: sportsTranslationEnabled,
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
      const jobs = data.workspace?.jobs ?? [];
      const hasRunnable = jobs.some(isRunnableJob);

      if (!data.job) {
        if (!hasRunnable) {
          setQueueRunning(false);
          queueAutoStartedRef.current = false;
        } else {
          window.setTimeout(() => setQueueTick((tick) => tick + 1), 1000);
        }
        return;
      }

      if (data.job.status === "failed" || data.job.status === "waiting_approval") {
        setQueueRunning(false);
        queueAutoStartedRef.current = false;
        return;
      }

      if (!hasRunnable) {
        setQueueRunning(false);
        queueAutoStartedRef.current = false;
        return;
      }

      if (data.job?.status === "completed") {
        queueRunModeRef.current = "queue";
      }

      window.setTimeout(() => setQueueTick((tick) => tick + 1), 400);
    },
    onError: () => {
      window.setTimeout(() => setQueueTick((tick) => tick + 1), 1200);
    },
  });

  const runSelectedJob = useMutation({
    mutationFn: (jobId: string) => aiSeoApi.runWorkspaceJob(jobId),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      if (["failed", "cancelled", "waiting_approval"].includes(job.status)) {
        if (queueRunModeRef.current === "checked") {
          advanceCheckedQueue();
        } else {
          setQueueRunning(false);
          queueAutoStartedRef.current = false;
        }
        return;
      }
      if (job.status === "completed") {
        if (queueRunModeRef.current === "checked") {
          advanceCheckedQueue();
          return;
        }
        if (autoRunJobsEnabled) {
          queueRunModeRef.current = "queue";
          window.setTimeout(() => setQueueTick((tick) => tick + 1), 400);
          return;
        }
        setQueueRunning(false);
        queueAutoStartedRef.current = false;
        return;
      }
      window.setTimeout(() => setQueueTick((tick) => tick + 1), 400);
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      setQueueRunning(false);
      queueAutoStartedRef.current = false;
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

  const disableScheduledAutomation = useMutation({
    mutationFn: () => aiSeoApi.disableWorkspaceScheduledAutomation(),
    onSuccess: (data) => {
      qc.setQueryData(["ai-seo-workspace"], data.workspace);
    },
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

  function confirmDeleteJob(jobId: string) {
    if (window.confirm("למחוק את ה-job? אם הוא עדיין פעיל או בתור, הוא יבוטל אוטומטית לפני המחיקה.")) {
      deleteJob.mutate(jobId);
    }
  }

  function startQueueProcessor(mode: "queue" | "selected" | "checked" = "queue") {
    queueRunModeRef.current = mode;
    setQueueRunning(true);
    setQueueTick((tick) => tick + 1);
  }

  function startSelectedJob() {
    if (!selectedJobId) return;
    startQueueProcessor("selected");
  }

  function advanceCheckedQueue() {
    const ids = queueTargetIdsRef.current;
    let nextIdx = queueTargetIndexRef.current + 1;
    const currentJobs = workspace.data?.jobs ?? [];
    while (nextIdx < ids.length) {
      const nextJob = currentJobs.find((item) => item.id === ids[nextIdx]);
      if (nextJob && isRunnableJob(nextJob)) {
        queueTargetIndexRef.current = nextIdx;
        setSelectedJobId(ids[nextIdx]);
        window.setTimeout(() => setQueueTick((tick) => tick + 1), 400);
        return;
      }
      nextIdx += 1;
    }
    setQueueRunning(false);
    queueAutoStartedRef.current = false;
  }

  function runActivatedJobs() {
    const ids = selectedJobIds.filter((id) => {
      const job = (workspace.data?.jobs ?? []).find((item) => item.id === id);
      return job && isRunnableJob(job);
    });
    if (!ids.length) return;
    queueTargetIdsRef.current = ids;
    queueTargetIndexRef.current = 0;
    setSelectedJobId(ids[0]);
    startQueueProcessor("checked");
  }

  function toggleJobSelection(jobId: string) {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId],
    );
  }

  function toggleAllJobsOnPage() {
    const pageIds = pagedJobs.map((job) => job.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedJobIds.includes(id));
    if (allSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedJobIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  }

  function runAllJobs() {
    setSelectedJobId(null);
    queueAutoStartedRef.current = true;
    startQueueProcessor("queue");
  }

  function autoStartQueueIfEnabled(jobId?: string) {
    if (!autoRunJobsEnabled) return;
    if (jobId) setSelectedJobId(jobId);
    queueAutoStartedRef.current = true;
    startQueueProcessor("queue");
  }

  function handleAutoRunToggle(enabled: boolean) {
    setAutoRunJobsEnabled(enabled);
    if (enabled) {
      queueAutoStartedRef.current = false;
      const hasRunnable = (workspace.data?.jobs ?? []).some(isRunnableJob);
      if (hasRunnable) startQueueProcessor("queue");
      return;
    }
    setQueueRunning(false);
    queueAutoStartedRef.current = false;
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
    if (!canManage || !autoRunJobsEnabled || queueRunning) return;
    const hasRunnable = (workspace.data?.jobs ?? []).some(isRunnableJob);
    if (!hasRunnable) {
      queueAutoStartedRef.current = false;
      return;
    }
    if (queueAutoStartedRef.current) return;
    queueAutoStartedRef.current = true;
    startQueueProcessor("queue");
  }, [workspace.data?.jobs, autoRunJobsEnabled, canManage, queueRunning]);

  useEffect(() => {
    if (!autoRunJobsEnabled || !canManage) return;
    const interval = window.setInterval(() => {
      const jobs = workspace.data?.jobs ?? [];
      if (!jobs.some(isRunnableJob)) return;
      if (queueRunning || runNextStep.isPending || runSelectedJob.isPending) return;
      queueAutoStartedRef.current = false;
      startQueueProcessor("queue");
    }, 8000);
    return () => window.clearInterval(interval);
  }, [
    autoRunJobsEnabled,
    canManage,
    workspace.data?.jobs,
    queueRunning,
    runNextStep.isPending,
    runSelectedJob.isPending,
  ]);

  useEffect(() => {
    if (!queueRunning || runNextStep.isPending || runSelectedJob.isPending) return;
    if (queueRunModeRef.current === "selected" && selectedJobId) {
      runSelectedJob.mutate(selectedJobId);
      return;
    }
    if (queueRunModeRef.current === "checked") {
      const currentId = queueTargetIdsRef.current[queueTargetIndexRef.current];
      if (currentId) runSelectedJob.mutate(currentId);
      return;
    }
    runNextStep.mutate();
  }, [queueRunning, queueTick, selectedJobId]);

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

  useEffect(() => {
    if (internationalNewsTranslationEnabled) {
      setOutputTypes(["blog"]);
    }
  }, [internationalNewsTranslationEnabled]);

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
  const runnableJobsCount = jobs.filter(isRunnableJob).length;
  const activatedRunnableCount = selectedJobIds.filter((id) => {
    const job = jobs.find((item) => item.id === id);
    return job && isRunnableJob(job);
  }).length;
  const queueStats = workspace.data?.queue_stats;
  const batchJobsGridClass = "grid-cols-[40px_1.6fr_0.8fr_0.7fr_0.9fr_1fr_1fr_0.8fr_0.8fr]";
  const researchCurrentPage = Math.min(researchPage, pageCount(sourceFilteredResearch.length));
  const jobsCurrentPage = Math.min(jobsPage, pageCount(filteredJobs.length));
  const draftsCurrentPage = Math.min(draftsPage, pageCount(drafts.length));
  const pagedResearchRows = pageSlice(sourceFilteredResearch, researchCurrentPage);
  const pagedJobs = pageSlice(filteredJobs, jobsCurrentPage);
  const allJobsOnPageSelected =
    pagedJobs.length > 0 && pagedJobs.every((job) => selectedJobIds.includes(job.id));
  const pagedDrafts = pageSlice(drafts, draftsCurrentPage);
  const selectedResearchRows = researchRows.filter((row) => selectedResearchIds.includes(row.id));
  const selectedResearchDomainValues = Array.from(new Set(selectedResearchRows.map((row) => row.category_value).filter(Boolean)));
  const canScheduleResearchJobs = selectedResearchRows.length > 0 && (selectedDomains.length > 0 || selectedResearchDomainValues.length > 0);
  const geminiReady = workspace.data?.gemini_configured;
  const geminiEnabled = workspace.data?.gemini_enabled !== false;
  const scheduledAutomation = workspace.data?.scheduled_automation ?? null;
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const allDomainsSelected = domains.length > 0 && selectedDomains.length === domains.length;
  const canStartGeneration =
    randomTopicsEnabled ||
    newsHotTopicsEnabled ||
    internationalNewsTranslationEnabled ||
    selectedDomains.length > 0;
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600";
  const selectClass = inputClass;

  const STEPS = [
    { id: 1, label: "מחקר ומילות מפתח", active: true },
    { id: 2, label: "יצירת סקיצה", active: false },
    { id: 3, label: "יצירת תוכן", active: false },
    { id: 4, label: "פרסום ומעקב", active: false },
  ];

  function requestCancelScheduledAutomation() {
    if (
      window.confirm(
        "לבטל את האוטומציה? ריצות ממתינות יבוטלו ולא ייווצרו ריצות חוזרות נוספות.",
      )
    ) {
      disableScheduledAutomation.mutate();
    }
  }

  return (
    <div className="workspace-studio -m-6 min-h-full bg-[#080c16] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {scheduledAutomation?.active ? (
          <div ref={automationBannerRef}>
            <ActiveAutomationBanner
              automation={scheduledAutomation}
              canCancel={canManage}
              cancelPending={disableScheduledAutomation.isPending}
              onCancel={requestCancelScheduledAutomation}
            />
          </div>
        ) : null}

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#12182a]/60 p-5 backdrop-blur-sm">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-400 transition hover:text-[#c4b5fd]">
              ← חזרה לדשבורד
            </Link>
            <h1 className="mt-2 bg-gradient-to-l from-white to-slate-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
              ממשק עבודה וניהול
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              מחולל תוכן חכם עם AI · מחקר SEO · אוטומציה חוזרת
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGuide((v) => !v)}
              className="border-[#6F42F5]/40 bg-[#6F42F5]/10 text-[#ddd6fe] hover:bg-[#6F42F5]/20"
            >
              {showGuide ? "הסתר מדריך" : "מדריך מהיר"}
            </Button>
            <Link href="/dashboard/automation">
              <Button type="button" variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                פאנל ג׳ובים
              </Button>
            </Link>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-0">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2 px-1 sm:px-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                    step.active
                      ? "bg-[#6F42F5] text-white shadow-lg shadow-[#6F42F5]/40"
                      : "border border-white/15 bg-white/5 text-slate-500"
                  }`}
                >
                  {step.id}
                </div>
                <span className={`hidden text-sm sm:inline ${step.active ? "font-semibold text-white" : "text-slate-500"}`}>
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="mx-1 hidden h-px w-8 workspace-stepper-line sm:block lg:w-14" />
              )}
            </div>
          ))}
        </div>

        {showGuide && (
          <div className="rounded-2xl border border-[#6F42F5]/30 bg-[#6F42F5]/10 p-4 text-sm text-slate-200">
            <p className="font-medium">מדריך מהיר</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-slate-300">
              <li><strong>ריצה עכשיו:</strong> בחר תחומים / מילים / רנדומלי → «צור תוכן עכשיו»</li>
              <li><strong>מחקר:</strong> «הפעל מחקר» → סמן ביטויים → «הוסף למילות מפתח»</li>
              <li><strong>אוטומציה:</strong> עבור לטאב «אוטומציה חוזרת» → הגדר מרווח → «הפעל אוטומציה»</li>
              <li>אשר פרסום מתוך טיוטות או הפעל «פרסום אוטומטי»</li>
            </ol>
          </div>
        )}

        {!geminiReady && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-medium text-amber-200">
              {geminiEnabled ? "Gemini לא מוגדר ב-backend." : "Gemini AI מושבת במתג המערכת."}
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              {geminiEnabled
                ? "הוסף `GEMINI_API_KEY` ב-Railway ובצע Redeploy."
                : "כל יצירת התוכן, האוטומציות והסוכנים המשתמשים ב-Gemini הושהו."}
            </p>
          </div>
        )}

        {/* Action hero — mode + CTA */}
        {canManage && (
          <StudioPanel
            title="יצירת תוכן"
            subtitle="מצב ריצה, הגדרות תוכן, תוצר והפעלה — כולל אוטומציה חוזרת"
            accent={runMode === "now" ? "purple" : "emerald"}
            className="border-2"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeSegment
                active={runMode === "now"}
                tone="now"
                icon="▶"
                title="ריצה עכשיו"
                description="יצירה חד-פעמית לפי תחומים, מילות מפתח או נושאים אקראיים"
                onClick={() => {
                  setRunMode("now");
                  setScheduleEnabled(false);
                }}
              />
              <ModeSegment
                active={runMode === "automation"}
                tone="automation"
                icon="🔄"
                title="אוטומציה חוזרת"
                description="ריצות אוטומטיות כל X דקות — בלי לחיצה חוזרת"
                onClick={() => {
                  setRunMode("automation");
                  setScheduleEnabled(true);
                }}
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">סוג תוצר</p>
              <div className="flex flex-wrap gap-2">
                <OutputPill
                  label="בלוג / מאמר"
                  active={outputTypes.includes("blog") && !outputTypes.includes("landing_page")}
                  disabled={newsHotTopicsEnabled || internationalNewsTranslationEnabled}
                  onClick={() => setOutputTypes(["blog"])}
                />
                <OutputPill
                  label="דף נחיתה"
                  active={outputTypes.includes("landing_page") && !outputTypes.includes("blog")}
                  disabled={newsHotTopicsEnabled || internationalNewsTranslationEnabled}
                  onClick={() => setOutputTypes(["landing_page"])}
                />
                <OutputPill
                  label="שניהם"
                  active={outputTypes.includes("blog") && outputTypes.includes("landing_page")}
                  disabled={newsHotTopicsEnabled || internationalNewsTranslationEnabled}
                  onClick={() => setOutputTypes(["blog", "landing_page"])}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <OptionCard
                checked={randomTopicsEnabled}
                onChange={setRandomTopicsEnabled}
                tone="purple"
                title="נושאים אקראיים"
                description="המערכת בוחרת תחומים ומילים חמות — בלי לבחור ידנית"
              />
              <OptionCard
                checked={newsHotTopicsEnabled}
                onChange={(checked) => {
                  setNewsHotTopicsEnabled(checked);
                  if (checked) setInternationalNewsTranslationEnabled(false);
                }}
                tone="amber"
                title="חדשות חמות"
                description="אירוע מ-24 שעות → מאמר + דף נחיתה"
              />
              <OptionCard
                checked={internationalNewsTranslationEnabled}
                onChange={(checked) => {
                  setInternationalNewsTranslationEnabled(checked);
                  if (checked) {
                    setNewsHotTopicsEnabled(false);
                    setOutputTypes(["blog"]);
                  }
                }}
                tone="sky"
                title="תרגם כתבות חדשותיות עם לינק למקור"
                description="BBC, Reuters, CNN, Guardian, NYT, Al Jazeera ועוד — מאמר מתורגם + קישור למקור"
              />
              <OptionCard
                checked={autoPublishEnabled}
                onChange={setAutoPublishEnabled}
                title="פרסום אוטומטי"
                description="העלאה לפרודקשן ללא אישור ידני"
              />
            </div>

            {randomTopicsEnabled && (
              <label className="mt-3 block max-w-xs text-sm">
                <span className="mb-1 block text-slate-400">נושאים אקראיים בכל batch</span>
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

            {runMode === "automation" && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-medium text-emerald-100">תזמון חוזר</p>
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
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="schedule-start" checked={scheduleStartNow} onChange={() => setScheduleStartNow(true)} className="accent-emerald-500" />
                    התחל עכשיו
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="schedule-start" checked={!scheduleStartNow} onChange={() => setScheduleStartNow(false)} className="accent-emerald-500" />
                    התחל בשעה
                  </label>
                  {!scheduleStartNow && (
                    <input type="datetime-local" className={`${inputClass} sm:col-span-2`} value={scheduleStartAt} onChange={(e) => setScheduleStartAt(e.target.value)} />
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">הגדרות תוכן</p>
                  <p className="text-xs text-slate-400">חלק מיצירת התוכן — הנחיות, שפות וסגנון כתיבה</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-[#c4b5fd] hover:underline"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "הסתר מתקדמות" : "הגדרות מתקדמות"}
                </button>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-400">הנחיות ל-Gemini</span>
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="לדוגמה: להתמקד בלידים לעסקים קטנים, טון מקצועי, CTA ברור..."
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-400">שפות תוכן</span>
                  <select className={selectClass} value={contentLocales} onChange={(e) => setContentLocales(e.target.value as "both" | "he" | "en" | "ar")}>
                    <option value="both">עברית + אנגלית</option>
                    <option value="he">עברית בלבד</option>
                    <option value="en">אנגלית בלבד</option>
                    <option value="ar">ערבית בלבד</option>
                  </select>
                </label>
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
              {hasSportsSelected && (
                <div className="mt-3">
                  <OptionCard
                    checked={sportsTranslationEnabled}
                    onChange={setSportsTranslationEnabled}
                    tone="purple"
                    title="תרגום כתבת ספורט (כדורגל)"
                    description="כתבה עיתונאית מתורגמת עם תמונת סטוק — בעברית ובאנגלית"
                  />
                </div>
              )}
              {showAdvanced && (
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <label className="block">
                    <span className="mb-1 block text-slate-400">תאריך פרסום</span>
                    <input type="datetime-local" className={inputClass} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#6F42F5]" checked={landingDesignEnabled} onChange={(e) => setLandingDesignEnabled(e.target.checked)} />
                    <span>עיצוב אקראי לדפי נחיתה</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#6F42F5]" checked={freeImageEnabled} onChange={(e) => setFreeImageEnabled(e.target.checked)} />
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
            </div>

            <Button
              type="button"
              className={`mt-5 w-full py-6 text-lg font-bold shadow-xl transition hover:scale-[1.01] active:scale-[0.99] ${
                runMode === "now"
                  ? "bg-[#6F42F5] text-white shadow-[#6F42F5]/40 hover:bg-[#5a32d4]"
                  : "bg-emerald-600 text-white shadow-emerald-600/40 hover:bg-emerald-500"
              }`}
              disabled={
                !geminiReady ||
                generate.isPending ||
                !canStartGeneration ||
                outputTypes.length === 0 ||
                (runMode === "automation" && scheduleEveryMinutes < 3) ||
                (runMode === "automation" && !scheduleStartNow && !scheduleStartAt)
              }
              onClick={() => {
                setGenerateFeedback(null);
                generate.mutate(runMode);
              }}
            >
              {generate.isPending ? "יוצר batch..." : runMode === "now" ? "▶ צור תוכן עכשיו" : "🔄 הפעל אוטומציה חוזרת"}
            </Button>
            {generateFeedback ? (
              <p
                className={`mt-2 text-center text-sm ${
                  generateFeedback.tone === "success" ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {generateFeedback.message}
              </p>
            ) : null}
            {!canStartGeneration && (
              <p className="mt-2 text-center text-xs text-amber-300">
                בחרו תחום, או סמנו «נושאים אקראיים» / «חדשות חמות»
              </p>
            )}
          </StudioPanel>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr] xl:items-start">
          {/* Domains — step 1 */}
          <div className="space-y-5">
            <StudioPanel title="תחומים ומילות מפתח" subtitle="שלב 1 — בחרו נושאים או הוסיפו מילים מהמחקר" step={1} accent="purple">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {businessDomains.map((domain) => (
                  <DomainTile
                    key={domain.value}
                    selected={selectedDomains.includes(domain.value)}
                    onClick={() => toggleDomain(domain.value)}
                    icon={DOMAIN_ICONS[domain.value] || "📌"}
                    label={domain.label}
                  />
                ))}
              </div>
              {newsDomains.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-300">חדשות מהיום</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {newsDomains.map((domain) => (
                      <DomainTile
                        key={domain.value}
                        variant="news"
                        selected={selectedDomains.includes(domain.value)}
                        onClick={() => toggleDomain(domain.value)}
                        icon={DOMAIN_ICONS[domain.value] || "📰"}
                        label={domain.label}
                      />
                    ))}
                  </div>
                </>
              )}
              {hasNewsDomainsSelected && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-100">
                  Gemini יבנה מאמר ודף נחיתה סביב אירוע חדשותי טרנדי.
                </p>
              )}
              <label className="mt-4 block text-sm">
                <span className="mb-1 block font-medium text-slate-300">מילות מפתח</span>
                <p className="mb-2 text-xs text-slate-500">
                  גררו ביטויים מטבלת המחקר לבלונים, או הקלידו ישירות.
                </p>
                {selectedResearchRows.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mb-2 border-[#6F42F5]/50 bg-[#6F42F5]/15 text-[#ddd6fe] hover:bg-[#6F42F5]/25"
                    onClick={() => addResearchToKeywords(selectedResearchRows)}
                  >
                    ↓ הוסף {selectedResearchRows.length} ביטויים מהמחקר
                  </Button>
                )}
                <KeywordChipField value={keywordsText} onChange={setKeywordsText} />
              </label>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-[#6F42F5]" checked={allDomainsSelected} onChange={toggleAllDomains} />
                  <span>בחר הכל</span>
                </label>
                <span className="rounded-full bg-[#6F42F5]/20 px-2.5 py-0.5 text-xs font-medium text-[#ddd6fe]">
                  {selectedDomains.length} תחומים
                </span>
              </div>
            </StudioPanel>

            <StudioPanel title="מה כולל המחקר?" accent="sky" className="hidden lg:block">
              <ul className="space-y-2 text-sm text-slate-300">
                {["זיהוי טרנדים עדכניים", "מילות מפתח בנפח גבוה", "ניתוח כוונת חיפוש", "הצעות כותרות ו-meta"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-[#6F42F5]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">ניתוח מתחרים</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">User Intent</span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">כותרות / Meta</span>
              </div>
            </StudioPanel>
          </div>

          {/* SEO — step 2 */}
          <div className="flex flex-col gap-5">
            <StudioPanel title="מקור SEO" subtitle="הפעילו מחקר לפני יצירת תוכן" step={2} accent="sky">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSeoSource("trends")}
                  className={`rounded-xl border p-4 text-start transition ${
                    seoSource === "trends"
                      ? "border-[#6F42F5] bg-[#6F42F5]/15 ring-1 ring-[#6F42F5]/40"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Google Trends</span>
                    <span className="rounded-full bg-[#6F42F5] px-2 py-0.5 text-[10px] font-bold text-white">מומלץ</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">טרנדים, related queries, נפח יחסי</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSeoSource("search_console")}
                  className={`rounded-xl border p-4 text-start transition ${
                    seoSource === "search_console"
                      ? "border-[#6F42F5] bg-[#6F42F5]/15 ring-1 ring-[#6F42F5]/40"
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
                  className="mt-4 w-full bg-[#6F42F5] hover:bg-[#5a32d4]"
                  disabled={refreshResearch.isPending}
                  onClick={() => refreshResearch.mutate()}
                >
                  {refreshResearch.isPending ? "מריץ מחקר..." : "הפעל מחקר SEO"}
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
          </div>
        </div>

        {/* Research results */}
        <StudioPanel title="תוצאות מחקר SEO" subtitle="סמנו ביטויים והעבירו לשדה מילות המפתח" accent="sky">
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
                  className="bg-[#6F42F5] hover:bg-[#5a32d4]"
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
                  <span
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-research-keyword", row.keyword);
                      event.dataTransfer.setData("text/plain", row.keyword);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    className="cursor-grab font-medium text-white active:cursor-grabbing"
                    title="גרור לשדה מילות המפתח"
                  >
                    {row.keyword}
                  </span>
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
          {queueStats && (
            <div className="mb-4 grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs text-slate-500">ממתינים בתור</p>
                <p className="text-lg font-semibold text-amber-200">{queueStats.waiting}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">רצים עכשיו</p>
                <p className="text-lg font-semibold text-sky-200">{queueStats.running}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">הושלמו היום</p>
                <p className="text-lg font-semibold text-emerald-200">{queueStats.completed_today}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">נכשלו היום</p>
                <p className="text-lg font-semibold text-red-300">{queueStats.failed_today}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">התחילו היום</p>
                <p className="text-lg font-semibold text-violet-200">{queueStats.started_today}</p>
              </div>
            </div>
          )}
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
                    jobTab === tab ? "bg-[#6F42F5] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
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
              <Button
                type="button"
                size="sm"
                disabled={activatedRunnableCount === 0 || runSelectedJob.isPending || runNextStep.isPending || queueRunning}
                onClick={runActivatedJobs}
                className="bg-[#6F42F5] hover:bg-[#5a32d4]"
              >
                הפעל{activatedRunnableCount > 0 ? ` (${activatedRunnableCount})` : ""}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={runnableJobsCount === 0 || runSelectedJob.isPending || runNextStep.isPending || queueRunning}
                onClick={runAllJobs}
                className="border-white/10 bg-white/5"
              >
                הרץ הכל{runnableJobsCount > 0 ? ` (${runnableJobsCount})` : ""}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedJobId || runSelectedJob.isPending || runNextStep.isPending}
                onClick={startSelectedJob}
                className="border-white/10 bg-white/5"
              >
                הרץ נבחר
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
              <div className="min-w-[1100px]">
                <div className={`grid ${batchJobsGridClass} bg-white/5 px-3 py-2 text-xs font-medium text-slate-400`}>
                  <label className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allJobsOnPageSelected}
                      onChange={toggleAllJobsOnPage}
                      aria-label="בחר הכל בעמוד"
                    />
                  </label>
                  <span>משימה</span>
                  <span>סוג תוכן</span>
                  <span>נושאים</span>
                  <span>סטטוס</span>
                  <span>התקדמות</span>
                  <span>זמן ריצה עתידי</span>
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
                      className={`grid ${batchJobsGridClass} items-center border-t border-white/10 px-3 py-3 text-sm ${
                        isSelected ? "bg-[#6F42F5]/10" : "hover:bg-white/5"
                      }`}
                    >
                      <label className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedJobIds.includes(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`בחר ${job.name}`}
                        />
                      </label>
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
                          <span className="block h-1.5 rounded-full bg-[#6F42F5]" style={{ width: `${job.progress_percent}%` }} />
                        </span>
                      </div>
                      {(() => {
                        const nextRun = jobNextRunLabel(job);
                        const isImmediate = nextRun === "מיידי";
                        return (
                          <span
                            className={`text-xs ${isImmediate ? "font-medium text-emerald-300" : "text-slate-400"}`}
                            title={isImmediate ? "ממתין להרצה בתור" : undefined}
                          >
                            {nextRun}
                          </span>
                        );
                      })()}
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
                          <p className="text-xs text-slate-400">
                            {page.page_type} · {page.status} · {page.locale === "en" ? "EN" : "HE"} · {page.full_path || "ללא path"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => togglePreview(page.id)} className="border-white/10 bg-white/5">
                          {previewExpanded ? "− סגור" : "+ תצוגה"}
                        </Button>
                        <Link href={page.test_url}>
                          <Button type="button" variant="outline" size="sm" className="border-white/10 bg-white/5">אזור טסט</Button>
                        </Link>
                        {page.status === "published" && page.full_path && (
                          <Link href={page.full_path} locale={pageLocale(page.locale)}>
                            <Button type="button" variant="outline" size="sm" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                              דף חי
                            </Button>
                          </Link>
                        )}
                        {canPublish && page.status !== "published" && (
                          <Button type="button" size="sm" className="bg-[#6F42F5] hover:bg-[#5a32d4]" onClick={() => publish.mutate(page)} disabled={publish.isPending}>
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
