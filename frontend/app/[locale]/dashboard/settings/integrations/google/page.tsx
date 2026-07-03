"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { integrationsApi, type GoogleIntegrationDashboard } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";

const STATUS_ICON: Record<string, string> = {
  connected: "🟢",
  waiting_authorization: "🟡",
  config_required: "🟡",
  not_connected: "🔴",
  error: "🔴",
};

type ServiceKey = "search_console" | "analytics" | "trends";

export default function GoogleIntegrationsPage() {
  const t = useTranslations("integrations");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("integrations.view");
  const canManage = hasPermission("integrations.manage");
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [trendsKeywords, setTrendsKeywords] = useState("mendeles");
  const [trendsCountry, setTrendsCountry] = useState<"IL" | "US" | "BOTH">("IL");
  const [trendsLanguage, setTrendsLanguage] = useState<"he" | "en" | "auto">("auto");
  const [trendsDateRange, setTrendsDateRange] = useState<"24h" | "7d" | "30d">("7d");
  const [propertyLists, setPropertyLists] = useState<Record<string, Array<{ id: string; label: string }>>>({});

  const dashboard = useQuery({
    queryKey: ["integrations-google"],
    queryFn: integrationsApi.googleDashboard,
    enabled: canView,
  });

  const loadProperties = useCallback(async (service_type: ServiceKey) => {
    const res = await integrationsApi.googleProperties(service_type);
    setPropertyLists((prev) => ({ ...prev, [service_type]: res.properties }));
  }, []);

  const connect = useMutation({
    mutationFn: (service_type: ServiceKey) => integrationsApi.googleConnect(service_type),
    onSuccess: (data) => {
      if (data.auth_url) window.location.href = data.auth_url;
      else qc.invalidateQueries({ queryKey: ["integrations-google"] });
    },
  });

  const disconnect = useMutation({
    mutationFn: (service_type: ServiceKey) => integrationsApi.googleDisconnect(service_type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations-google"] }),
  });

  const selectProperty = useMutation({
    mutationFn: ({ service_type, property_id }: { service_type: ServiceKey; property_id: string }) =>
      integrationsApi.googleSelectProperty(service_type, property_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations-google"] }),
  });

  const sync = useMutation({
    mutationFn: (payload: {
      service_type: ServiceKey;
      keywords?: string;
      countries?: string[];
      language?: string;
      date_range?: string;
    }) =>
      integrationsApi.googleSync(payload.service_type, {
        keywords: payload.keywords?.split("\n").map((k) => k.trim()).filter(Boolean),
        ...(payload.countries ? { countries: payload.countries } : {}),
        ...(payload.language ? { language: payload.language } : {}),
        ...(payload.date_range ? { date_range: payload.date_range } : {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations-google"] }),
  });

  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    if (oauthSuccess === "search_console" || oauthSuccess === "analytics") {
      qc.invalidateQueries({ queryKey: ["integrations-google"] });
      loadProperties(oauthSuccess);
    }
  }, [searchParams, qc, loadProperties]);

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  const data = dashboard.data as GoogleIntegrationDashboard | undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/settings" className="text-sm text-[var(--muted-fg)] hover:underline">
          ← {t("backToSettings")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t("google.title")}</h1>
        <p className="text-sm text-[var(--muted-fg)]">{t("google.subtitle")}</p>
      </div>

      {searchParams.get("oauth_error") && (
        <Card className="border-red-500/50 bg-red-500/10">
          <p className="text-sm text-red-600">
            {t("google.oauthError")}: {searchParams.get("oauth_error")}
          </p>
        </Card>
      )}

      {!data?.oauth_platform_configured && data?.setup_instructions?.length ? (
        <Card>
          <h2 className="font-semibold">{t("google.setupRequired")}</h2>
          <p className="mt-2 text-sm text-[var(--muted-fg)]">{t("google.setupHint")}</p>
          <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm">
            {data.setup_instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Card>
      ) : null}

      {dashboard.isLoading && <p className="text-sm">{tc("loading")}</p>}

      {data?.services.map((svc) => {
        const key = svc.service_type as ServiceKey;
        const icon = STATUS_ICON[svc.status] || "🔴";
        const isOAuth = key !== "trends";
        const props = propertyLists[key] ?? [];
        const statusText =
          key === "trends" && svc.status === "connected" && !svc.last_sync_at
            ? t("google.trendsAvailable")
            : t(`google.status.${svc.status}`);

        return (
          <Card key={svc.service_type}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {icon} {t(`google.services.${key}`)}
                </h2>
                <p className="text-sm text-[var(--muted-fg)]">{statusText}</p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {isOAuth && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={connect.isPending || svc.status === "config_required"}
                      onClick={() => connect.mutate(key)}
                    >
                      {t("google.connect")}
                    </Button>
                  )}
                  {isOAuth && svc.status !== "not_connected" && svc.status !== "config_required" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disconnect.isPending}
                      onClick={() => disconnect.mutate(key)}
                    >
                      {t("google.disconnect")}
                    </Button>
                  )}
                  {isOAuth && svc.connected_account && (
                    <Button type="button" variant="outline" size="sm" onClick={() => loadProperties(key)}>
                      {t("google.loadProperties")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={sync.isPending || (isOAuth && svc.status !== "connected")}
                    onClick={() =>
                      sync.mutate({
                        service_type: key,
                        keywords: key === "trends" ? trendsKeywords : undefined,
                        countries:
                          key === "trends"
                            ? trendsCountry === "BOTH"
                              ? ["IL", "US"]
                              : [trendsCountry]
                            : undefined,
                        language: key === "trends" && trendsLanguage !== "auto" ? trendsLanguage : undefined,
                        date_range: key === "trends" ? trendsDateRange : undefined,
                      })
                    }
                  >
                    {t("google.syncNow")}
                  </Button>
                </div>
              )}
            </div>

            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {svc.connected_account && (
                <div>
                  <dt className="text-[var(--muted-fg)]">{t("google.account")}</dt>
                  <dd>{svc.connected_account}</dd>
                </div>
              )}
              {svc.property_label && (
                <div>
                  <dt className="text-[var(--muted-fg)]">{t("google.property")}</dt>
                  <dd>{svc.property_label}</dd>
                </div>
              )}
              <div>
                <dt className="text-[var(--muted-fg)]">{t("google.lastSync")}</dt>
                <dd>{svc.last_sync_at ? new Date(svc.last_sync_at).toLocaleString() : "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-fg)]">{t("google.nextSync")}</dt>
                <dd>{svc.next_sync_at ? new Date(svc.next_sync_at).toLocaleString() : "—"}</dd>
              </div>
              {svc.last_error && (
                <div className="sm:col-span-2">
                  <dt className="text-[var(--muted-fg)]">{t("google.error")}</dt>
                  <dd className="text-red-600">{svc.last_error}</dd>
                </div>
              )}
            </dl>

            {key === "trends" && canManage && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm sm:col-span-2">
                  <p className="font-medium">{t("google.trendsNoOAuthTitle")}</p>
                  <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("google.trendsNoOAuthBody")}</p>
                </div>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">{t("google.trendsKeywords")}</span>
                  <textarea
                    className="w-full rounded-md border border-[var(--border)] bg-transparent p-2 text-sm"
                    rows={3}
                    value={trendsKeywords}
                    onChange={(e) => setTrendsKeywords(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">{t("google.trendsCountry")}</span>
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-transparent p-2 text-sm"
                    value={trendsCountry}
                    onChange={(e) => setTrendsCountry(e.target.value as "IL" | "US" | "BOTH")}
                  >
                    <option value="IL">{t("google.trendsCountries.IL")}</option>
                    <option value="US">{t("google.trendsCountries.US")}</option>
                    <option value="BOTH">{t("google.trendsCountries.BOTH")}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">{t("google.trendsLanguage")}</span>
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-transparent p-2 text-sm"
                    value={trendsLanguage}
                    onChange={(e) => setTrendsLanguage(e.target.value as "he" | "en" | "auto")}
                  >
                    <option value="auto">{t("google.trendsLanguages.auto")}</option>
                    <option value="he">{t("google.trendsLanguages.he")}</option>
                    <option value="en">{t("google.trendsLanguages.en")}</option>
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">{t("google.trendsDateRange")}</span>
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-transparent p-2 text-sm"
                    value={trendsDateRange}
                    onChange={(e) => setTrendsDateRange(e.target.value as "24h" | "7d" | "30d")}
                  >
                    <option value="24h">{t("google.trendsRanges.24h")}</option>
                    <option value="7d">{t("google.trendsRanges.7d")}</option>
                    <option value="30d">{t("google.trendsRanges.30d")}</option>
                  </select>
                </label>
                <p className="text-xs text-[var(--muted-fg)] sm:col-span-2">{t("google.trendsHint")}</p>
              </div>
            )}

            {props.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">{t("google.selectProperty")}</span>
                  <select
                    className="w-full max-w-md rounded-md border border-[var(--border)] bg-transparent p-2 text-sm"
                    value={svc.property_id || ""}
                    onChange={(e) => selectProperty.mutate({ service_type: key, property_id: e.target.value })}
                  >
                    <option value="">{t("google.chooseProperty")}</option>
                    {props.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </Card>
        );
      })}

      {data?.recent_syncs?.length ? (
        <Card>
          <h2 className="font-semibold">{t("google.recentSyncs")}</h2>
          <ul className="mt-3 divide-y text-sm">
            {data.recent_syncs.map((s) => (
              <li key={s.id} className="flex justify-between gap-2 py-2">
                <span>
                  {t(`google.services.${s.service_type as ServiceKey}`)} — {s.sync_status}
                </span>
                <span className="text-[var(--muted-fg)]">{new Date(s.retrieved_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-[var(--muted-fg)]">{t("google.noSyncs")}</p>
        </Card>
      )}
    </div>
  );
}
