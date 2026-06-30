import { getTranslations } from "next-intl/server";
import { AI_CAPABILITY_KEYS } from "@/lib/marketing/content";

const ICONS = ["✨", "🔎", "💬", "📝"];

export async function AiSection() {
  const t = await getTranslations("landing.ai");

  return (
    <section id="ai" className="border-t border-[var(--border)] bg-[var(--muted)]/40 px-6 py-20" aria-labelledby="ai-title">
      <div className="mx-auto max-w-6xl">
        <h2 id="ai-title" className="text-3xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted-fg)]">{t("subtitle")}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {AI_CAPABILITY_KEYS.map((key, i) => (
            <article
              key={key}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-lg" aria-hidden="true">
                {ICONS[i]}
              </div>
              <h3 className="mt-4 font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-fg)]">{t(`items.${key}.desc`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
