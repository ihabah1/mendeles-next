"use client";

import { useMemo, useState } from "react";
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
        domain: selectedRows.map((d) => d.label).join(", "),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  const runJob = useMutation({
    mutationFn: (jobId: string) => aiSeoApi.runWorkspaceJob(jobId),
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

  const jobs = workspace.data?.jobs ?? [];
  const drafts = workspace.data?.drafts ?? [];
  const geminiReady = workspace.data?.gemini_configured;

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

      <Card className="border-emerald-500/40 bg-emerald-500/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Batch Jobs</h2>
            <p className="text-xs text-[var(--muted-fg)]">מתעדכן כל 10 שניות.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] })}>
            רענן
          </Button>
        </div>
        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">אין jobs עדיין.</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-lg border border-emerald-500/30 bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <Link href={`/dashboard/automation/${job.id}`} className="font-medium hover:underline">
                      {job.name}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--muted-fg)]">
                      סטטוס: {job.status} · התקדמות: {job.progress_percent}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(job.status === "queued" || job.status === "scheduled" || job.status === "failed") && canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={runJob.isPending}
                        onClick={() => runJob.mutate(job.id)}
                      >
                        הרץ עכשיו
                      </Button>
                    )}
                    <span className="rounded-full border border-emerald-500/30 px-2 py-1 text-xs">{job.status}</span>
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-emerald-950">
                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${job.progress_percent}%` }} />
                </div>
                <ol className="mt-4 grid gap-2 sm:grid-cols-5">
                  {(job.steps.length
                    ? job.steps
                    : [
                        { id: `${job.id}-data`, name: "דאטה", status: job.progress_percent >= 20 ? "completed" : "pending", step_type: "ai_seo.data", error_message: null },
                        { id: `${job.id}-ai`, name: "AI", status: job.progress_percent >= 40 ? "completed" : "pending", step_type: "ai_seo.ai", error_message: null },
                        { id: `${job.id}-design`, name: "עיצוב", status: job.progress_percent >= 60 ? "completed" : "pending", step_type: "ai_seo.design", error_message: null },
                        { id: `${job.id}-page`, name: "הקמת דף", status: job.progress_percent >= 80 ? "completed" : "pending", step_type: "ai_seo.page", error_message: null },
                        { id: `${job.id}-finish`, name: "סיום", status: job.progress_percent >= 100 ? "completed" : "pending", step_type: "ai_seo.finish", error_message: null },
                      ]
                  ).map((step) => (
                    <li
                      key={step.id}
                      className={`rounded-md border p-2 text-center text-xs ${
                        step.status === "completed"
                          ? "border-emerald-400/60 bg-emerald-500/20"
                          : step.status === "running"
                            ? "border-sky-400/60 bg-sky-500/20"
                            : step.status === "failed"
                              ? "border-red-400/60 bg-red-500/20"
                              : "border-[var(--border)] bg-black/10"
                      }`}
                    >
                      <p className="font-medium">{step.name}</p>
                      <p className="mt-1 text-[var(--muted-fg)]">{step.status}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 rounded-md border border-emerald-500/20 bg-black/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Logs</p>
                  {job.logs.length === 0 ? (
                    <p className="mt-2 text-xs text-[var(--muted-fg)]">
                      עדיין אין לוגים. אם ה-job נשאר queued, לחץ “הרץ עכשיו” או ודא שה-worker פעיל.
                    </p>
                  ) : (
                    <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
                      {job.logs.map((log) => (
                        <li key={log.id} className="flex gap-2">
                          <span className="text-emerald-300">{log.level}</span>
                          <span>{log.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {job.error_message && <p className="mt-2 text-xs text-red-500">{job.error_message}</p>}
              </li>
            ))}
          </ul>
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
                <label className="mt-3 block text-sm">
                  <span className="mb-1 block font-medium">הערות ליצירה חוזרת</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-[var(--border)] bg-transparent p-2"
                    value={feedbackByPage[page.id] || ""}
                    onChange={(e) => setFeedbackByPage((prev) => ({ ...prev, [page.id]: e.target.value }))}
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
                    שלח פרומפט ליצירה חוזרת
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
