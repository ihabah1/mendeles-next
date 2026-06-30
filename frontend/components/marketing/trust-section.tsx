import { getTranslations } from "next-intl/server";
import { TRUST_KEYS } from "@/lib/marketing/content";

const ICONS = ["⚡", "🔒", "♿", "🔎", "🚀", "🤖"];

export async function TrustSection() {
  const t = await getTranslations("landing.trust");

  return (
    <section id="trust" className="border-t border-[var(--border)] px-6 py-16" aria-labelledby="trust-title">
      <div className="mx-auto max-w-6xl">
        <h2 id="trust-title" className="sr-only">
          {t("title")}
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TRUST_KEYS.map((key, i) => (
            <li
              key={key}
              className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-5 text-center"
            >
              <span className="text-2xl" aria-hidden="true">
                {ICONS[i]}
              </span>
              <span className="mt-2 text-sm font-semibold">{t(`items.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
