"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { automationApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import {
  AccessibilityAuditReport,
  isAccessibilityAuditReport,
} from "@/components/automation/accessibility-audit-report";
import { AccessibilityIcon } from "@/components/a11y/accessibility-icon";

const ACCESSIBILITY_AUDIT = "accessibility_audit";

export default function AutomationJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const t = useTranslations("automation");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("automation.view");
  const canManage = hasPermission("automation.manage");
  const canApprove = hasPermission("automation.approve");
  const canCancel = hasPermission("automation.cancel");
  const qc = useQueryClient();

  const job = useQuery({
    queryKey: ["automation-job", jobId],
    queryFn: () => automationApi.get(jobId),
    enabled: canView && Boolean(jobId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["automation-job", jobId] });
    qc.invalidateQueries({ queryKey: ["automation-dashboard"] });
  };

  const pause = useMutation({ mutationFn: () => automationApi.pause(jobId), onSuccess: invalidate });
  const resume = useMutation({ mutationFn: () => automationApi.resume(jobId), onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: () => automationApi.cancel(jobId), onSuccess: invalidate });
  const retry = useMutation({ mutationFn: () => automationApi.retry(jobId), onSuccess: invalidate });
  const approve = useMutation({ mutationFn: () => automationApi.approve(jobId), onSuccess: invalidate });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  if (job.isLoading) return <p className="text-sm">{tc("loading")}</p>;
  if (job.isError || !job.data) {
    return (
      <Card>
        <p className="text-sm text-red-600">{t("loadError")}</p>
        <Link href="/dashboard/automation" className="mt-2 inline-block text-sm underline">
          {t("back")}
        </Link>
      </Card>
    );
  }

  const data = job.data;
  const auditReport = isAccessibilityAuditReport(data.config?.accessibility_audit)
    ? data.config.accessibility_audit
    : null;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/automation" className="text-sm text-[var(--muted-fg)] hover:underline">
        {t("back")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        {data.job_type === ACCESSIBILITY_AUDIT && (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
            <AccessibilityIcon className="h-6 w-6" />
          </span>
        )}
        <h1 className="text-2xl font-bold">{data.name}</h1>
      </div>
      <p className="text-sm text-[var(--muted-fg)]">
        {t(`statuses.${data.status}` as "statuses.queued")} · {data.progress_percent}%
      </p>

      <div className="flex flex-wrap gap-2">
        {canManage && data.status === "queued" && (
          <Button variant="outline" onClick={() => pause.mutate()} disabled={pause.isPending}>
            {t("pause")}
          </Button>
        )}
        {canManage && data.status === "paused" && (
          <Button variant="outline" onClick={() => resume.mutate()} disabled={resume.isPending}>
            {t("resume")}
          </Button>
        )}
        {canCancel && !["completed", "cancelled"].includes(data.status) && (
          <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            {t("cancel")}
          </Button>
        )}
        {canManage && data.status === "failed" && (
          <Button variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
            {t("retry")}
          </Button>
        )}
        {canApprove && data.status === "waiting_approval" && (
          <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
            {t("approve")}
          </Button>
        )}
      </div>

      {auditReport && <AccessibilityAuditReport report={auditReport} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">{t("progress")}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-[var(--muted-fg)]">{t("completedTasks")}</dt>
              <dd>{data.completed_tasks}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("remainingTasks")}</dt>
              <dd>{data.remaining_tasks}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("failedTasks")}</dt>
              <dd>{data.failed_tasks}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("retryCount")}</dt>
              <dd>{data.retry_count}</dd>
            </div>
            {data.error_message && (
              <div>
                <dt className="text-[var(--muted-fg)]">{t("error")}</dt>
                <dd className="text-red-600">{data.error_message}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold">{t("timeline")}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-[var(--muted-fg)]">{t("createdBy")}</dt>
              <dd>{data.created_by || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("startedAt")}</dt>
              <dd>{data.started_at ? new Date(data.started_at).toLocaleString() : "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("finishedAt")}</dt>
              <dd>{data.finished_at ? new Date(data.finished_at).toLocaleString() : "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">{t("logs")}</h2>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
          {data.logs.map((log) => (
            <li key={log.id} className="rounded border border-[var(--border)] p-2">
              <span className="text-xs uppercase text-[var(--muted-fg)]">{log.level}</span>
              <p>{log.message}</p>
              <time className="text-xs text-[var(--muted-fg)]">
                {new Date(log.created_at).toLocaleString()}
              </time>
            </li>
          ))}
          {!data.logs.length && <li className="text-[var(--muted-fg)]">{t("noLogs")}</li>}
        </ul>
      </Card>
    </div>
  );
}
