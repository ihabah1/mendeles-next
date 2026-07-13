"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { automationApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { SYSTEM_LOCALES } from "@/lib/i18n/system-locales";
import { cn } from "@/lib/utils";

const ALL_LOCALES = SYSTEM_LOCALES.map((l) => ({ code: l.code, label: l.native }));

const ACTIVE = new Set(["queued", "running", "retrying"]);
const OPEN = new Set(["queued", "running", "retrying", "paused"]);

export default function SiteTranslationsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("automation.view");
  const canCreate = hasPermission("automation.create");
  const canManage = hasPermission("automation.manage");
  const canCancel = hasPermission("automation.cancel");
  const qc = useQueryClient();

  const [locales, setLocales] = useState<string[]>(["he", "en", "es", "ar", "de", "zh"]);
  const [skipExisting, setSkipExisting] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const autoRun = useRef(false);

  const preview = useQuery({
    queryKey: ["site-translation-preview", locales.join(","), skipExisting],
    queryFn: () => automationApi.siteTranslationPreview({ locales, skip_existing: skipExisting }),
    enabled: canView,
  });

  const jobs = useQuery({
    queryKey: ["site-translation-jobs"],
    queryFn: () => automationApi.list({ job_type: "translate_site_pages", page: "1" }),
    enabled: canView,
    refetchInterval: 4000,
  });

  const recent = useMemo(() => jobs.data?.results || [], [jobs.data]);
  const openJob = useMemo(() => recent.find((row) => OPEN.has(row.status)) || null, [recent]);

  useEffect(() => {
    if (!activeJobId && openJob?.id) {
      setActiveJobId(openJob.id);
    }
  }, [activeJobId, openJob?.id]);

  const activeJob = useQuery({
    queryKey: ["automation-job", activeJobId],
    queryFn: () => automationApi.get(activeJobId!),
    enabled: canView && Boolean(activeJobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status && ACTIVE.has(status) ? 2000 : false;
    },
  });

  const create = useMutation({
    mutationFn: (forceNew: boolean) =>
      automationApi.createSiteTranslation({
        target_locales: locales,
        skip_existing: skipExisting,
        overwrite,
        force_new: forceNew,
      }),
    onSuccess: (job) => {
      setError("");
      setActiveJobId(job.id);
      autoRun.current = true;
      qc.invalidateQueries({ queryKey: ["site-translation-jobs"] });
      qc.invalidateQueries({ queryKey: ["site-translation-preview"] });
      qc.setQueryData(["automation-job", job.id], job);
    },
    onError: (err: Error) => setError(err.message || "Failed to create job"),
  });

  const runNext = useMutation({
    mutationFn: (id: string) => automationApi.runNext(id),
    onSuccess: (job) => {
      setActiveJobId(job.id);
      qc.setQueryData(["automation-job", job.id], job);
      qc.invalidateQueries({ queryKey: ["site-translation-jobs"] });
      if (job.status === "paused" || job.status === "completed" || job.status === "cancelled" || job.status === "failed") {
        autoRun.current = false;
      }
    },
    onError: (err: Error) => {
      autoRun.current = false;
      setError(err.message || "Run next failed");
    },
  });

  const pause = useMutation({
    mutationFn: (id: string) => automationApi.pause(id),
    onSuccess: (job) => {
      autoRun.current = false;
      setActiveJobId(job.id);
      qc.setQueryData(["automation-job", job.id], job);
      qc.invalidateQueries({ queryKey: ["site-translation-jobs"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const resume = useMutation({
    mutationFn: (id: string) => automationApi.resume(id),
    onSuccess: (job) => {
      setActiveJobId(job.id);
      autoRun.current = true;
      qc.setQueryData(["automation-job", job.id], job);
      qc.invalidateQueries({ queryKey: ["site-translation-jobs"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => automationApi.cancel(id),
    onSuccess: (job) => {
      autoRun.current = false;
      setActiveJobId(job.id);
      qc.invalidateQueries({ queryKey: ["site-translation-jobs"] });
    },
  });

  const job = activeJob.data;

  useEffect(() => {
    if (!autoRun.current || !job?.id) return;
    if (!ACTIVE.has(job.status)) return;
    if (runNext.isPending || pause.isPending) return;
    const t = window.setTimeout(() => runNext.mutate(job.id), 350);
    return () => window.clearTimeout(t);
  }, [job?.id, job?.status, job?.progress_percent, job?.completed_tasks, runNext.isPending, pause.isPending]);

  function toggleLocale(code: string) {
    setLocales((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function startOrContinue() {
    // Backend reuses the open job unless force_new=true — completed steps stay completed.
    create.mutate(false);
  }

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">אין הרשאה לצפות באוטומציית תרגום.</p>
      </Card>
    );
  }

  const primaryPending = create.isPending || resume.isPending;
  const hasOpenJob = Boolean(openJob);
  const primaryLabel = hasOpenJob
    ? primaryPending
      ? "ממשיך…"
      : `המשך ג'וב תרגום (${openJob?.progress_percent ?? 0}%)`
    : primaryPending
      ? "יוצר…"
      : "התחל ג'וב תרגום";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="space-y-2">
        <Link href="/dashboard/automation" className="text-sm text-[var(--muted-fg)] hover:underline">
          ← מרכז האוטומציה
        </Link>
        <h1 className="text-2xl font-bold">תרגום דפי האתר</h1>
        <p className="max-w-2xl text-sm text-[var(--muted-fg)]">
          ג&apos;וב שמתרגם דפי תוכן, לובי ודשבורד לכל שפה. יחידות שכבר תורגמו לא ירוצו שוב.
          אפשר להשהות (Pause) ולהמשיך — ההתקדמות נשמרת באחוזים.
        </p>
      </div>

      <Card className="space-y-4 !rounded-2xl">
        <h2 className="font-semibold">{hasOpenJob ? "המשך ג'וב קיים" : "הגדרת ג'וב חדש"}</h2>
        {hasOpenJob ? (
          <p className="rounded-xl bg-[var(--muted)]/40 px-4 py-3 text-sm">
            יש ג&apos;וב פתוח ב־{openJob?.progress_percent ?? 0}% ({openJob?.status}). לחיצה על הכפתור תמשיך משם ולא תתחיל
            מההתחלה.
          </p>
        ) : null}
        <div>
          <p className="mb-2 text-sm font-medium">שפות יעד</p>
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-[#6F42F5] underline"
              onClick={() => setLocales(ALL_LOCALES.map((l) => l.code))}
            >
              בחר הכל
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--muted-fg)] underline"
              onClick={() => setLocales([])}
            >
              נקה בחירה
            </button>
          </div>
          <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3">
            {ALL_LOCALES.map((loc) => (
              <button
                key={loc.code}
                type="button"
                onClick={() => toggleLocale(loc.code)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold",
                  locales.includes(loc.code) ? "bg-[#6F42F5] text-white" : "bg-[var(--muted)]",
                )}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} />
          דלג על דפים שכבר קיימים בשפת היעד
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => {
              setOverwrite(e.target.checked);
              if (e.target.checked) setSkipExisting(false);
            }}
          />
          שכתב תרגומים קיימים
        </label>
        {preview.data ? (
          <div className="rounded-xl bg-[var(--muted)]/40 px-4 py-3 text-sm">
            <p>
              דפי מקור: <strong>{preview.data.source_pages}</strong>
            </p>
            <p>
              יחידות תרגום מתוכננות: <strong>{preview.data.planned_units}</strong>
            </p>
            <p className="text-[var(--muted-fg)]">דילוגים על קיימים: {preview.data.skipped_existing}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={
              !canCreate ||
              locales.length === 0 ||
              primaryPending ||
              (!hasOpenJob && (preview.data?.planned_units || 0) === 0)
            }
            onClick={startOrContinue}
            className="rounded-full bg-[#6F42F5] font-bold text-white"
          >
            {primaryLabel}
          </Button>
          {hasOpenJob && canCreate ? (
            <Button
              type="button"
              variant="outline"
              disabled={create.isPending || locales.length === 0 || (preview.data?.planned_units || 0) === 0}
              onClick={() => create.mutate(true)}
              className="rounded-full"
            >
              התחל ג&apos;וב חדש (מבטל את הפתוח)
            </Button>
          ) : null}
        </div>
      </Card>

      {job ? (
        <Card className="space-y-4 !rounded-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{job.name}</h2>
              <p className="text-sm text-[var(--muted-fg)]">
                {job.status} · {job.completed_tasks}/{job.total_tasks} · {job.progress_percent}%
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && ACTIVE.has(job.status) ? (
                <Button type="button" variant="outline" disabled={pause.isPending} onClick={() => pause.mutate(job.id)}>
                  Pause
                </Button>
              ) : null}
              {canManage && job.status === "paused" ? (
                <Button
                  type="button"
                  className="bg-[#6F42F5] text-white"
                  disabled={resume.isPending}
                  onClick={() => resume.mutate(job.id)}
                >
                  Resume
                </Button>
              ) : null}
              {canCancel && !["completed", "cancelled"].includes(job.status) ? (
                <Button type="button" variant="outline" className="text-red-600" onClick={() => cancel.mutate(job.id)}>
                  Cancel
                </Button>
              ) : null}
              {canManage && ACTIVE.has(job.status) && !autoRun.current ? (
                <Button type="button" variant="outline" disabled={runNext.isPending} onClick={() => {
                  autoRun.current = true;
                  runNext.mutate(job.id);
                }}>
                  Run next
                </Button>
              ) : null}
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[#6F42F5] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, job.progress_percent || 0))}%` }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="הושלמו" value={job.completed_tasks} />
            <Stat label="נותרו" value={job.remaining_tasks} />
            <Stat label="נכשלו" value={job.failed_tasks} />
          </div>

          {job.error_message ? <p className="text-sm text-red-600">{job.error_message}</p> : null}

          <div className="max-h-80 overflow-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--muted)]/80 text-xs uppercase text-[var(--muted-fg)]">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">יחידה</th>
                  <th className="px-3 py-2">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {(job.steps || []).map((step, idx) => (
                  <tr key={String(step.id)} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 text-[var(--muted-fg)]">{idx + 1}</td>
                    <td className="px-3 py-2">{String(step.name || "")}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-bold uppercase">
                        {String(step.status || "")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">ג&apos;ובים קודמים</h2>
        <Card className="overflow-x-auto !rounded-2xl !p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-xs uppercase text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 text-start">שם</th>
                <th className="px-4 py-3 text-start">סטטוס</th>
                <th className="px-4 py-3 text-start">התקדמות</th>
                <th className="px-4 py-3 text-start">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{row.progress_percent}%</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs font-bold text-[#6F42F5] hover:underline"
                      onClick={() => {
                        setActiveJobId(row.id);
                        autoRun.current = ACTIVE.has(row.status);
                      }}
                    >
                      פתח
                    </button>
                  </td>
                </tr>
              ))}
              {!recent.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-[var(--muted-fg)]">
                    עדיין אין ג&apos;ובי תרגום — צרו אחד למעלה.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--muted)]/40 px-4 py-3">
      <p className="text-xs text-[var(--muted-fg)]">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
