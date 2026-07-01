"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { seoApi, type SEOSettings } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";

type Tab = "settings" | "status" | "validation";

const FIELDS: Array<{ key: keyof SEOSettings; multiline?: boolean }> = [
  { key: "site_name" },
  { key: "default_title" },
  { key: "default_description", multiline: true },
  { key: "default_keywords", multiline: true },
  { key: "default_author" },
  { key: "default_language" },
  { key: "robots_policy" },
  { key: "canonical_base_url" },
  { key: "default_og_image" },
  { key: "default_twitter_image" },
  { key: "organization_name" },
  { key: "organization_logo" },
  { key: "organization_url" },
];

export default function SeoPage() {
  const t = useTranslations("seo");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("seo.view");
  const canManage = hasPermission("seo.manage");
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("settings");
  const [form, setForm] = useState<Partial<SEOSettings>>({});

  const settingsQuery = useQuery({
    queryKey: ["seo-settings"],
    queryFn: seoApi.getSettings,
    enabled: canView,
  });

  const statusQuery = useQuery({
    queryKey: ["seo-status"],
    queryFn: seoApi.status,
    enabled: canView && tab === "status",
  });

  const validationQuery = useQuery({
    queryKey: ["seo-validation"],
    queryFn: () => seoApi.validate(),
    enabled: canView && tab === "validation",
  });

  const saveMutation = useMutation({
    mutationFn: () => seoApi.updateSettings(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-settings"] });
      qc.invalidateQueries({ queryKey: ["seo-status"] });
      setForm({});
    },
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  const settings = settingsQuery.data;
  const merged = { ...settings, ...form } as SEOSettings;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        {(["settings", "status", "validation"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === key ? "bg-[var(--muted)] font-semibold" : "hover:bg-[var(--muted)]"}`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === "settings" && (
        <Card>
          {settingsQuery.isLoading ? (
            <p className="text-sm">{tc("loading")}</p>
          ) : (
            <form
              className="grid max-w-2xl gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (canManage) saveMutation.mutate();
              }}
            >
              {FIELDS.map(({ key, multiline }) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block font-medium">{t(`fields.${key}`)}</span>
                  {multiline ? (
                    <textarea
                      className="w-full rounded-md border border-[var(--border)] bg-transparent p-2 text-sm"
                      rows={3}
                      value={(merged?.[key] as string) ?? ""}
                      disabled={!canManage}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      value={(merged?.[key] as string) ?? ""}
                      disabled={!canManage}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  )}
                </label>
              ))}
              {canManage && (
                <Button type="submit" disabled={saveMutation.isPending || !Object.keys(form).length}>
                  {tc("save")}
                </Button>
              )}
            </form>
          )}
        </Card>
      )}

      {tab === "status" && (
        <Card>
          {statusQuery.isLoading ? (
            <p className="text-sm">{tc("loading")}</p>
          ) : statusQuery.data ? (
            <div className="space-y-3 text-sm">
              <p>
                {t("overallScore")}: <strong>{statusQuery.data.overall_score}</strong>
              </p>
              <p>
                {t("productionReady")}:{" "}
                <strong>{statusQuery.data.ready_for_production ? t("yes") : t("no")}</strong>
              </p>
              <div>
                <h2 className="font-semibold">{t("globalHealth")}</h2>
                <p>{t("score")}: {statusQuery.data.global.score}</p>
                <IssueList issues={statusQuery.data.global.issues} />
              </div>
              <div>
                <h2 className="font-semibold">{t("homepageHealth")}</h2>
                <p>{t("score")}: {statusQuery.data.homepage.score}</p>
                <IssueList issues={statusQuery.data.homepage.issues} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)]">{tc("error")}</p>
          )}
        </Card>
      )}

      {tab === "validation" && (
        <Card>
          {validationQuery.isLoading ? (
            <p className="text-sm">{tc("loading")}</p>
          ) : validationQuery.data ? (
            <div className="space-y-2 text-sm">
              <p>
                {t("score")}: <strong>{validationQuery.data.score}</strong> —{" "}
                {validationQuery.data.valid ? t("valid") : t("invalid")}
              </p>
              <IssueList issues={validationQuery.data.issues} />
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-fg)]">{tc("error")}</p>
          )}
        </Card>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: Array<{ code: string; severity: string; message: string }> }) {
  if (!issues.length) return <p className="text-[var(--muted-fg)]">—</p>;
  return (
    <ul className="mt-1 list-inside list-disc space-y-1">
      {issues.map((issue) => (
        <li key={issue.code} className={issue.severity === "error" ? "text-red-600" : "text-amber-600"}>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
