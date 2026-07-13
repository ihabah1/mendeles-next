"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ControlCenterData } from "@/lib/api/dashboard";
import { settingsApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { invalidatePublicFeaturesCache } from "@/lib/site/features";

const FLAG_LABELS: Record<string, { he: string; en: string; hintHe: string; hintEn: string }> = {
  contact_widget_home: {
    he: "בלון \"צור קשר\" בדף הבית",
    en: "Contact balloon on homepage",
    hintHe: "הצג או הסתר את בלון יצירת הקשר בדף הראשי",
    hintEn: "Show or hide the contact widget on the public homepage",
  },
  whatsapp_balloon: {
    he: "בלון WhatsApp",
    en: "WhatsApp balloon",
    hintHe: "הצג או הסתר את כפתור הצ'אט הירוק של WhatsApp בדפי האתר",
    hintEn: "Show or hide the green WhatsApp chat button on public pages",
  },
};

type Props = { data: ControlCenterData; locale: string };

export function FeatureFlagsPanel({ data, locale }: Props) {
  const t = useTranslations("controlCenter");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canManage = hasPermission("settings.manage");
  const isHe = locale === "he";

  const mutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      settingsApi.update({ [key]: enabled ? "true" : "false" }),
    onSuccess: () => {
      invalidatePublicFeaturesCache();
      qc.invalidateQueries({ queryKey: ["control-center"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["public-features"] });
    },
  });

  return (
    <div className="cc-card overflow-hidden">
      <div className="border-b border-[var(--cc-border)] px-5 py-4">
        <h3 className="font-semibold text-[var(--cc-fg)]">{t("featureFlagsTitle")}</h3>
        <p className="mt-1 text-sm text-[var(--cc-muted)]">{t("featureFlagsHint")}</p>
      </div>
      <table className="cc-table w-full text-sm">
        <thead>
          <tr>
            <th>{t("colFeature")}</th>
            <th>{t("colDescription")}</th>
            <th>{t("colStatus")}</th>
            <th className="text-end">{t("colAction")}</th>
          </tr>
        </thead>
        <tbody>
          {data.feature_flags.map((flag) => {
            const labels = FLAG_LABELS[flag.slug];
            return (
              <tr key={flag.key}>
                <td className="font-medium">{isHe ? labels?.he : labels?.en ?? flag.slug}</td>
                <td className="text-[var(--cc-muted)]">{isHe ? labels?.hintHe : labels?.hintEn}</td>
                <td>
                  <span className={`cc-badge ${flag.enabled ? "cc-badge--ok" : "cc-badge--off"}`}>
                    {flag.enabled ? tc("on") : tc("off")}
                  </span>
                </td>
                <td className="text-end">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      role="switch"
                      className="h-5 w-9 accent-[var(--cc-accent)] disabled:opacity-50"
                      checked={flag.enabled}
                      disabled={!canManage || mutation.isPending}
                      onChange={(e) => mutation.mutate({ key: flag.key, enabled: e.target.checked })}
                    />
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
