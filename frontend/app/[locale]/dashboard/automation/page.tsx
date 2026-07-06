"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/admin/stat-card";
import { automationApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { AccessibilityIcon } from "@/components/a11y/accessibility-icon";

const ACCESSIBILITY_AUDIT = "accessibility_audit";

export default function AutomationPage() {
  const t = useTranslations("automation");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("automation.view");
  const canCreate = hasPermission("automation.create");
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [jobType, setJobType] = useState("health_check");

  const dashboard = useQuery({
    queryKey: ["automation-dashboard"],
    queryFn: automationApi.dashboard,
    enabled: canView,
  });
  const types = useQuery({
    queryKey: ["automation-job-types"],
    queryFn: automationApi.jobTypes,
    enabled: canView,
  });

  const createMutation = useMutation({
    mutationFn: (payload?: { name?: string; job_type?: string }) =>
      automationApi.create({
        name: payload?.name || name || t("accessibilityAudit.defaultName"),
        job_type: payload?.job_type || jobType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-dashboard"] });
      setName("");
    },
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  const stats = dashboard.data?.stats;
  const jobs = dashboard.data?.recent_jobs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
      </div>

      {dashboard.isLoading && <p className="text-sm">{tc("loading")}</p>}
      {dashboard.isError && <p className="text-sm text-red-600">{t("loadError")}</p>}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("running")} value={stats.running_jobs} accent />
            <StatCard label={t("queued")} value={stats.queue_size} />
            <StatCard label={t("scheduled")} value={stats.scheduled_jobs} />
            <StatCard label={t("completed")} value={stats.completed_jobs} />
            <StatCard label={t("failed")} value={stats.failed_jobs} />
            <StatCard label={t("paused")} value={stats.paused_jobs} />
            <StatCard label={t("waitingApproval")} value={stats.waiting_approval} />
            <StatCard label={t("workers")} value={stats.workers_total} />
          </div>

          {canCreate && (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{t("accessibilityAudit.quickCreateTitle")}</h2>
                  <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("accessibilityAudit.quickCreateDesc")}</p>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    createMutation.mutate({
                      name: t("accessibilityAudit.defaultName"),
                      job_type: ACCESSIBILITY_AUDIT,
                    })
                  }
                  disabled={createMutation.isPending}
                  className="gap-2"
                >
                  <AccessibilityIcon className="h-5 w-5" />
                  {t("accessibilityAudit.runNow")}
                </Button>
              </div>
            </Card>
          )}

          {canCreate && (
            <Card>
              <h2 className="font-semibold">{t("createJob")}</h2>
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({});
                }}
              >
                <Input
                  placeholder={t("jobName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label={t("jobName")}
                  className="min-w-[12rem] flex-1"
                />
                <label className="sr-only" htmlFor="job-type">
                  {t("jobType")}
                </label>
                <select
                  id="job-type"
                  className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                >
                  {types.data?.results.map((jt) => (
                    <option key={jt.value} value={jt.value}>
                      {jt.label}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={createMutation.isPending}>
                  {t("create")}
                </Button>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold">{t("recentJobs")}</h2>
            {jobs.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-fg)]">{t("empty")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-start">
                      <th className="p-2">{t("jobName")}</th>
                      <th className="p-2">{t("jobType")}</th>
                      <th className="p-2">{t("status")}</th>
                      <th className="p-2">{t("progress")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-[var(--border)]">
                        <td className="p-2">
                          <Link href={`/dashboard/automation/${job.id}`} className="font-medium hover:underline">
                            {job.name}
                          </Link>
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center gap-2">
                            {job.job_type === ACCESSIBILITY_AUDIT && (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                                <AccessibilityIcon className="h-4 w-4" />
                              </span>
                            )}
                            {job.job_type === ACCESSIBILITY_AUDIT
                              ? t("accessibilityAudit.jobTypeLabel")
                              : job.job_type}
                          </span>
                        </td>
                        <td className="p-2">{t(`statuses.${job.status}` as "statuses.queued")}</td>
                        <td className="p-2">{job.progress_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
