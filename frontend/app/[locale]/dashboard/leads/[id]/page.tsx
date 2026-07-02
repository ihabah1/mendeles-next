"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { leadsApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const t = useTranslations("leads");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("leads.view");
  const canEdit = hasPermission("leads.edit");
  const canDelete = hasPermission("leads.delete");
  const qc = useQueryClient();
  const [noteBody, setNoteBody] = useState("");

  const statuses = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: leadsApi.statuses,
    enabled: canView,
  });

  const lead = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadsApi.get(leadId),
    enabled: canView && Boolean(leadId),
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => leadsApi.update(leadId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: () => leadsApi.addNote(leadId, noteBody),
    onSuccess: () => {
      setNoteBody("");
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => leadsApi.remove(leadId),
    onSuccess: () => {
      window.location.href = "/dashboard/leads";
    },
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  if (lead.isLoading) {
    return <p className="text-sm">{tc("loading")}</p>;
  }

  if (lead.isError || !lead.data) {
    return (
      <Card>
        <p className="text-sm text-red-600">{t("loadError")}</p>
        <Link href="/dashboard/leads" className="mt-2 inline-block text-sm underline">
          {t("backToList")}
        </Link>
      </Card>
    );
  }

  const data = lead.data;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard/leads" className="text-sm text-[var(--muted-fg)] hover:underline">
          {t("backToList")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{data.name || t("unnamed")}</h1>
        <p className="text-sm text-[var(--muted-fg)]">
          {t("createdAt")}: {data.created_at ? new Date(data.created_at).toLocaleString() : "—"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">{t("contactInfo")}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-[var(--muted-fg)]">{t("colEmail")}</dt>
              <dd>{data.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("colPhone")}</dt>
              <dd>{data.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("message")}</dt>
              <dd className="whitespace-pre-wrap">{data.message || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">{t("colSource")}</dt>
              <dd>{data.source_name || data.source || "—"}</dd>
            </div>
            {data.landing_page_path && (
              <div>
                <dt className="text-[var(--muted-fg)]">{t("landingPage")}</dt>
                <dd className="font-mono text-xs">{data.landing_page_path}</dd>
              </div>
            )}
            {data.page_url && (
              <div>
                <dt className="text-[var(--muted-fg)]">{t("pageUrl")}</dt>
                <dd className="break-all text-xs">{data.page_url}</dd>
              </div>
            )}
            {data.referrer && (
              <div>
                <dt className="text-[var(--muted-fg)]">{t("referrer")}</dt>
                <dd className="break-all text-xs">{data.referrer}</dd>
              </div>
            )}
          </dl>

          {canEdit && (
            <div className="mt-4">
              <label htmlFor="lead-status" className="mb-1 block text-sm font-medium">
                {t("colStatus")}
              </label>
              <select
                id="lead-status"
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={data.status}
                disabled={updateMutation.isPending}
                onChange={(e) => updateMutation.mutate(e.target.value)}
              >
                {statuses.data?.results.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(`status.${s.value}` as "status.new")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canDelete && (
            <Button
              variant="outline"
              className="mt-4 text-red-600"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm(t("deleteConfirm"))) deleteMutation.mutate();
              }}
            >
              {t("delete")}
            </Button>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">{t("utm")}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-[var(--muted-fg)]">utm_source</dt>
              <dd>{data.utm.source || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">utm_medium</dt>
              <dd>{data.utm.medium || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">utm_campaign</dt>
              <dd>{data.utm.campaign || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">utm_content</dt>
              <dd>{data.utm.content || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-fg)]">utm_term</dt>
              <dd>{data.utm.term || "—"}</dd>
            </div>
          </dl>
          <h3 className="mt-4 text-sm font-medium">{t("technical")}</h3>
          <dl className="mt-2 space-y-1 text-xs text-[var(--muted-fg)]">
            <div>
              <dt className="inline">IP: </dt>
              <dd className="inline">{data.ip_address || "—"}</dd>
            </div>
            <div>
              <dt>{t("userAgent")}</dt>
              <dd className="break-all">{data.user_agent || "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">{t("notes")}</h2>
        {canEdit && (
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (noteBody.trim()) noteMutation.mutate();
            }}
          >
            <label htmlFor="lead-note" className="sr-only">
              {t("addNote")}
            </label>
            <Input
              id="lead-note"
              placeholder={t("addNote")}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              className="min-w-[12rem] flex-1"
            />
            <Button type="submit" disabled={noteMutation.isPending || !noteBody.trim()}>
              {t("saveNote")}
            </Button>
          </form>
        )}
        <ul className="mt-4 space-y-3">
          {data.notes.map((note) => (
            <li key={note.id} className="rounded border border-[var(--border)] p-3 text-sm">
              <p>{note.body}</p>
              <p className="mt-1 text-xs text-[var(--muted-fg)]">
                {note.author} · {new Date(note.created_at).toLocaleString()}
              </p>
            </li>
          ))}
          {!data.notes.length && <li className="text-sm text-[var(--muted-fg)]">{t("noNotes")}</li>}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold">{t("activity")}</h2>
        <ol className="mt-4 space-y-2">
          {data.activities.map((act) => (
            <li key={act.id} className="border-s-2 border-[var(--border)] ps-3 text-sm">
              <div className="font-medium">{t(`activityType.${act.activity_type}` as "activityType.created")}</div>
              <div className="text-xs text-[var(--muted-fg)]">
                {act.actor ? `${act.actor} · ` : ""}
                {new Date(act.created_at).toLocaleString()}
              </div>
            </li>
          ))}
          {!data.activities.length && <li className="text-sm text-[var(--muted-fg)]">{t("noActivity")}</li>}
        </ol>
      </Card>
    </div>
  );
}
