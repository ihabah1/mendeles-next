"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { leadsApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";

const PAGE_SIZE = "25";

export default function LeadsPage() {
  const t = useTranslations("leads");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("leads.view");
  const canExport = hasPermission("leads.export");
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  const statuses = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: leadsApi.statuses,
    enabled: canView,
  });

  const leads = useQuery({
    queryKey: ["leads", page, search, status, source],
    queryFn: () =>
      leadsApi.list({
        page: String(page),
        page_size: PAGE_SIZE,
        q: search || undefined,
        status: status || undefined,
        source: source || undefined,
        sort: "-created_at",
      }),
    enabled: canView,
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      leadsApi.exportCsv({
        q: search || undefined,
        status: status || undefined,
        source: source || undefined,
      }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  const total = leads.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / Number(PAGE_SIZE)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
        </div>
        {canExport && (
          <Button
            variant="outline"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            {t("exportCsv")}
          </Button>
        )}
      </div>

      <Card>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q.trim());
            qc.invalidateQueries({ queryKey: ["leads"] });
          }}
        >
          <Input
            placeholder={t("searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("searchPlaceholder")}
            className="min-w-[12rem] flex-1"
          />
          <label className="sr-only" htmlFor="lead-filter-status">
            {t("filterStatus")}
          </label>
          <select
            id="lead-filter-status"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("allStatuses")}</option>
            {statuses.data?.results.map((s) => (
              <option key={s.value} value={s.value}>
                {t(`status.${s.value}` as "status.new")}
              </option>
            ))}
          </select>
          <Input
            placeholder={t("filterSource")}
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            aria-label={t("filterSource")}
            className="w-40"
          />
          <Button type="submit">{t("search")}</Button>
        </form>
      </Card>

      <Card>
        {leads.isLoading ? (
          <p className="text-sm">{tc("loading")}</p>
        ) : leads.isError ? (
          <p className="text-sm text-red-600">{t("loadError")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("title")}</caption>
              <thead>
                <tr className="border-b border-[var(--border)] text-start">
                  <th scope="col" className="p-2">
                    {t("colName")}
                  </th>
                  <th scope="col" className="p-2">
                    {t("colEmail")}
                  </th>
                  <th scope="col" className="p-2">
                    {t("colPhone")}
                  </th>
                  <th scope="col" className="p-2">
                    {t("colStatus")}
                  </th>
                  <th scope="col" className="p-2">
                    {t("colSource")}
                  </th>
                  <th scope="col" className="p-2">
                    {t("colCreated")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.data?.results.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                    <td className="p-2">
                      <Link href={`/dashboard/leads/${lead.id}`} className="font-medium underline-offset-2 hover:underline">
                        {lead.name || "—"}
                      </Link>
                    </td>
                    <td className="p-2">{lead.email || "—"}</td>
                    <td className="p-2">{lead.phone || "—"}</td>
                    <td className="p-2">{t(`status.${lead.status}` as "status.new")}</td>
                    <td className="p-2">{lead.source_name || lead.source || "—"}</td>
                    <td className="p-2 whitespace-nowrap">
                      {lead.created_at ? new Date(lead.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
                {!leads.data?.results.length && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-[var(--muted-fg)]">
                      {t("empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <nav className="mt-4 flex items-center justify-between gap-2" aria-label={t("pagination")}>
            <p className="text-sm text-[var(--muted-fg)]">
              {t("pageInfo", { page, total: totalPages, count: total })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-8 px-3 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("prev")}
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          </nav>
        )}
      </Card>
    </div>
  );
}
