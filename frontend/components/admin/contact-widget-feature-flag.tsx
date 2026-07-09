"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { settingsApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { invalidatePublicFeaturesCache } from "@/lib/site/features";

function isContactWidgetEnabled(value: string | undefined) {
  return value === undefined || value.trim().toLowerCase() !== "false";
}

export function ContactWidgetFeatureFlag() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canManage = hasPermission("settings.manage");

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    enabled: hasPermission("settings.view"),
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      settingsApi.update({ "features.contact_widget_home": enabled ? "true" : "false" }),
    onSuccess: () => {
      invalidatePublicFeaturesCache();
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["public-features"] });
    },
  });

  if (!hasPermission("settings.view")) return null;

  const enabled = isContactWidgetEnabled(settings.data?.["features.contact_widget_home"]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold">{t("contactWidgetFlag")}</h3>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("contactWidgetFlagHint")}</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-3">
          <span className="text-sm font-medium">{enabled ? tc("on") : tc("off")}</span>
          <input
            type="checkbox"
            role="switch"
            aria-checked={enabled}
            aria-label={t("contactWidgetFlag")}
            className="h-5 w-9 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            checked={enabled}
            disabled={!canManage || settings.isLoading || mutation.isPending}
            onChange={(e) => mutation.mutate(e.target.checked)}
          />
        </label>
      </div>
    </Card>
  );
}
