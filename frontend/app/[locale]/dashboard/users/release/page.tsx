"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import {
  emailReleaseApi,
  type BlockedRegistration,
  type PurgeResult,
} from "@/lib/api/dashboard";

function parseEmails(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ];
}

function statusLabel(t: ReturnType<typeof useTranslations>, status: PurgeResult["status"]) {
  if (status === "purged") return t("statusPurged");
  if (status === "skipped_verified") return t("statusSkippedVerified");
  return t("statusNotFound");
}

export default function EmailReleasePage() {
  const t = useTranslations("emailRelease");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canManage = hasPermission("tenants.view");

  const [searchEmail, setSearchEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [purgeTenant, setPurgeTenant] = useState(true);
  const [unverifiedOnly, setUnverifiedOnly] = useState(true);
  const [lookupResult, setLookupResult] = useState<BlockedRegistration | null | "missing">(null);
  const [purgeResults, setPurgeResults] = useState<PurgeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const blocked = useQuery({
    queryKey: ["blocked-registrations"],
    queryFn: () => emailReleaseApi.listBlocked(true),
    enabled: canManage,
  });

  const lookupMutation = useMutation({
    mutationFn: (email: string) => emailReleaseApi.lookup(email),
    onSuccess: (data) => {
      setError(null);
      if (data.found && data.user) setLookupResult(data.user);
      else setLookupResult("missing");
    },
    onError: (e: Error) => setError(e.message),
  });

  const purgeMutation = useMutation({
    mutationFn: (emails: string[]) =>
      emailReleaseApi.purge({ emails, purge_tenant: purgeTenant, unverified_only: unverifiedOnly }),
    onSuccess: (data) => {
      setPurgeResults(data.results);
      setError(null);
      setBulkEmails("");
      setLookupResult(null);
      qc.invalidateQueries({ queryKey: ["blocked-registrations"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const bulkList = useMemo(() => parseEmails(bulkEmails), [bulkEmails]);

  if (!canManage) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
        </div>
        <Link href="/dashboard/users" className="text-sm text-[var(--accent)] hover:underline">
          {t("backToUsers")}
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold">{t("searchTitle")}</h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("searchHint")}</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchEmail.trim()) lookupMutation.mutate(searchEmail.trim());
            }}
          >
            <Input
              type="email"
              placeholder={t("emailPlaceholder")}
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={lookupMutation.isPending}>
              {lookupMutation.isPending ? tc("loading") : t("search")}
            </Button>
          </form>

          {lookupResult === "missing" && (
            <p className="mt-3 text-sm text-[var(--muted-fg)]">{t("notFound")}</p>
          )}
          {lookupResult && lookupResult !== "missing" && (
            <div className="mt-4 rounded-lg border border-[var(--border)] p-3 text-sm">
              <p className="font-medium">{lookupResult.email}</p>
              <p className="text-[var(--muted-fg)]">
                {lookupResult.tenant_name || "—"} ·{" "}
                {lookupResult.email_verified ? t("verified") : t("unverified")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={purgeMutation.isPending}
                onClick={() => purgeMutation.mutate([lookupResult.email])}
              >
                {t("purgeOne")}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">{t("bulkTitle")}</h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("bulkHint")}</p>
          <textarea
            rows={6}
            className="mt-4 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder={t("bulkPlaceholder")}
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
          />
          <p className="mt-1 text-xs text-[var(--muted-fg)]">
            {t("bulkCount", { n: bulkList.length })}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={purgeTenant}
                onChange={(e) => setPurgeTenant(e.target.checked)}
              />
              {t("purgeTenant")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={unverifiedOnly}
                onChange={(e) => setUnverifiedOnly(e.target.checked)}
              />
              {t("unverifiedOnly")}
            </label>
          </div>
          <Button
            type="button"
            className="mt-4"
            disabled={bulkList.length === 0 || purgeMutation.isPending}
            onClick={() => purgeMutation.mutate(bulkList)}
          >
            {purgeMutation.isPending ? tc("loading") : t("purgeBulk")}
          </Button>
        </Card>
      </div>

      {purgeResults.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold">{t("resultsTitle")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {purgeResults.map((row) => (
              <li key={row.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--muted)]/40 px-3 py-2">
                <span>{row.email}</span>
                <span
                  className={
                    row.status === "purged"
                      ? "text-[var(--success)]"
                      : row.status === "skipped_verified"
                        ? "text-[var(--warning)]"
                        : "text-[var(--muted-fg)]"
                  }
                >
                  {statusLabel(t, row.status)}
                  {row.tenant_purged ? ` · ${t("tenantPurged")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="font-semibold">{t("listTitle")}</h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("listHint")}</p>
        </div>
        {blocked.isLoading && <p className="p-6 text-sm">{tc("loading")}</p>}
        {blocked.isError && <p className="p-6 text-sm text-red-600">{t("loadError")}</p>}
        {!blocked.isLoading && blocked.data?.results.length === 0 && (
          <p className="p-6 text-sm text-[var(--muted-fg)]">{t("empty")}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-start text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colEmail")}</th>
                <th className="px-4 py-3 font-medium">{t("colTenant")}</th>
                <th className="px-4 py-3 font-medium">{t("colCreated")}</th>
                <th className="px-4 py-3 font-medium">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {blocked.data?.results.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--muted)]/30">
                  <td className="px-4 py-3 font-medium">{row.email}</td>
                  <td className="px-4 py-3 text-[var(--muted-fg)]">{row.tenant_name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted-fg)]">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      disabled={purgeMutation.isPending}
                      onClick={() => {
                        if (confirm(t("confirmPurge", { email: row.email }))) {
                          purgeMutation.mutate([row.email]);
                        }
                      }}
                    >
                      {t("purgeOne")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
