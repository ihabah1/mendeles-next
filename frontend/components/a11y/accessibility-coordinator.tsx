import { getTranslations } from "next-intl/server";
import {
  getAccessibilitySiteConfig,
  isAccessibilityCoordinatorConfigured,
} from "@/lib/a11y/site-config";

export async function AccessibilityCoordinatorSection() {
  const t = await getTranslations("a11y.page");
  const config = getAccessibilitySiteConfig();
  const configured = isAccessibilityCoordinatorConfigured(config);

  return (
    <section className="mt-10 space-y-4" aria-labelledby="a11y-coordinator">
      <h2 id="a11y-coordinator" className="text-xl font-semibold text-white">
        {t("contactTitle")}
      </h2>
      <p className="text-slate-300">{t("contactBody")}</p>

      <dl className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <div>
          <dt className="font-medium text-white">{t("coordinatorNameLabel")}</dt>
          <dd className="mt-1">
            {config.coordinatorName ?? (
              <span className="italic text-slate-400">{t("placeholderValue")}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-white">{t("coordinatorPhoneLabel")}</dt>
          <dd className="mt-1">
            {config.coordinatorPhone ? (
              <a href={`tel:${config.coordinatorPhone}`} className="text-indigo-300 underline">
                {config.coordinatorPhone}
              </a>
            ) : (
              <span className="italic text-slate-400">{t("placeholderValue")}</span>
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
              <span className="italic text-slate-400">{t("placeholderValue")}</span>
            )}
          </dd>
        </div>
      </dl>

      {!configured && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t("coordinatorPending")}
        </p>
      )}

      <p className="text-sm text-slate-400">
        <span className="font-medium text-slate-300">{t("lastUpdatedLabel")}: </span>
        {config.statementLastUpdated ?? (
          <span className="italic">{t("placeholderValue")}</span>
        )}
      </p>
    </section>
  );
}
