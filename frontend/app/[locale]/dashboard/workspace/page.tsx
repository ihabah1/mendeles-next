"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/i18n/navigation";
import { aiSeoApi, type AiSeoWorkspaceDraft } from "@/lib/api/dashboard";
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

function DraftPreview({ page }: { page: AiSeoWorkspaceDraft }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-slate-950 to-slate-900 text-white shadow-inner">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Preview לפני פרודקשן</p>
        <h3 className="mt-2 text-2xl font-bold">{page.title}</h3>
        {page.meta_description && <p className="mt-2 max-w-3xl text-sm text-slate-300">{page.meta_description}</p>}
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
  const [feedbackByPage, setFeedbackByPage] = useState<Record<string, string>>({});
  const [queueRunning, setQueueRunning] = useState(false);
  const [queueTick, setQueueTick] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const workspace = useQuery({
    queryKey: ["ai-seo-workspace"],
    queryFn: aiSeoApi.workspace,
    enabled: canView,
    refetchInterval: 10000,
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
        locale: "he",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const publish = useMutation({
    mutationFn: (pageId: string) => aiSeoApi.publishWorkspacePage(pageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const regenerate = useMutation({
    mutationFn: (page: AiSeoWorkspaceDraft) =>
      aiSeoApi.regenerateWorkspacePage({
        page_id: page.id,
        feedback: feedbackByPage[page.id] || "",
        keywords: splitLines(keywordsText),
        domain: selectedRows.map((d) => d.label).join(", ") || page.title,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const runNextStep = useMutation({
    mutationFn: aiSeoApi.runNextWorkspaceQueueStep,
    onSuccess: (data) => {
      qc.setQueryData(["ai-seo-workspace"], data.workspace);
      qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] });
      if (!data.job || data.job.status === "failed") {
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
      if (["completed", "failed", "cancelled"].includes(job.status)) {
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

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="font-semibold">1. בחירת תחומים ומילות מפתח</h2>
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
          {canManage && (
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={!geminiReady || generate.isPending || selectedDomains.length === 0 || outputTypes.length === 0}
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
            {jobs.map((job) => {
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
              <ol className="mt-4 grid gap-2 sm:grid-cols-5">
                {(selectedJob.steps.length
                  ? selectedJob.steps
                  : [
                      { id: `${selectedJob.id}-data`, name: "דאטה", status: selectedJob.progress_percent >= 20 ? "completed" : "pending", step_type: "ai_seo.data", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-ai`, name: "AI", status: selectedJob.progress_percent >= 40 ? "completed" : "pending", step_type: "ai_seo.ai", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-design`, name: "עיצוב", status: selectedJob.progress_percent >= 60 ? "completed" : "pending", step_type: "ai_seo.design", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-page`, name: "הקמת דף", status: selectedJob.progress_percent >= 80 ? "completed" : "pending", step_type: "ai_seo.page", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                      { id: `${selectedJob.id}-finish`, name: "סיום", status: selectedJob.progress_percent >= 100 ? "completed" : "pending", step_type: "ai_seo.finish", error_message: null, started_at: null, is_stale: false, retry_count: 0, max_retries: 3 },
                    ]
                ).map((step) => (
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
                    {step.status === "running" && !step.is_stale && canManage && (
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
                ))}
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
        <h2 className="font-semibold">אזור טסטים ותוצרים</h2>
        {drafts.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">בסיום generation יופיעו כאן לינקים לטיוטות.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {drafts.map((page) => (
              <li key={page.id} className="rounded-lg border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{page.title}</p>
                    <p className="text-xs text-[var(--muted-fg)]">
                      {page.page_type} · {page.status} · {page.full_path || "ללא path"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={page.test_url}>
                      <Button type="button" variant="outline" size="sm">פתח באזור טסט</Button>
                    </Link>
                    {canPublish && page.status !== "published" && (
                      <Button type="button" size="sm" onClick={() => publish.mutate(page.id)} disabled={publish.isPending}>
                        אשר העלאה לפרודקשן
                      </Button>
                    )}
                  </div>
                </div>
                <DraftPreview page={page} />
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
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
