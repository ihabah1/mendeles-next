import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  getAccessibilitySiteConfig,
  isAccessibilityCoordinatorConfigured,
} from "@/lib/a11y/site-config";
import { isProductionRuntime } from "@/lib/seo/site-url";

function displayValue(value: string | null, devPlaceholder: string): ReactNode {
  if (value) return value;
  if (isProductionRuntime()) return "—";
  return <span className="italic text-slate-400">{devPlaceholder}</span>;
}

export async function AccessibilityCoordinatorSection() {
  const t = await getTranslations("a11y.page");
  const config = getAccessibilitySiteConfig();
  const configured = isAccessibilityCoordinatorConfigured(config);
  const isProd = isProductionRuntime();

  return (
    <section className="mt-10 space-y-4" aria-labelledby="a11y-coordinator">
      <h2 id="a11y-coordinator" className="text-xl font-semibold text-white">
        {t("contactTitle")}
      </h2>
      <p className="text-slate-300">{t("contactBody")}</p>

      <dl className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <div>
          <dt className="font-medium text-white">{t("coordinatorNameLabel")}</dt>
          <dd className="mt-1">{displayValue(config.coordinatorName, t("placeholderValue"))}</dd>
        </div>
        <div>
          <dt className="font-medium text-white">{t("coordinatorPhoneLabel")}</dt>
          <dd className="mt-1">
            {config.coordinatorPhone ? (
              <a href={`tel:${config.coordinatorPhone}`} className="text-indigo-300 underline">
                {config.coordinatorPhone}
              </a>
            ) : (
              displayValue(null, t("placeholderValue"))
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-white">{t("coordinatorEmailLabel")}</dt>
          <dd className="mt-1">
            {config.coordinatorEmail ? (
              <a href={`mailto:${config.coordinatorEmail}`} className="text-indigo-300 underline">
                {config.coordinatorEmail}
              </a>
            ) : (
              displayValue(null, t("placeholderValue"))
            )}
          </dd>
        </div>
      </dl>

      {!configured && !isProd ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t("coordinatorPending")}
        </p>
      ) : null}

      <p className="text-sm text-slate-400">
        <span className="font-medium text-slate-300">{t("lastUpdatedLabel")}: </span>
        {displayValue(config.statementLastUpdated, t("placeholderValue"))}
      </p>
    </section>
  );
}
