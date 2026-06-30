import { getTranslations } from "next-intl/server";
import { AI_CAPABILITY_KEYS } from "@/lib/marketing/content";

const ICONS = ["✨", "🔎", "💬", "📝"];

export async function AiSection() {
  const t = await getTranslations("landing.ai");

  return (
    <section id="ai" className="border-t border-white/10 bg-[#080c16] px-6 py-20" aria-labelledby="ai-title">
      <div className="mx-auto max-w-7xl">
        <h2 id="ai-title" className="text-3xl font-bold tracking-tight text-white">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-400">{t("subtitle")}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {AI_CAPABILITY_KEYS.map((key, i) => (
            <article key={key} className="rounded-xl border border-white/10 bg-[#0f1528]/60 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-lg" aria-hidden="true">
                {ICONS[i]}
              </div>
              <h3 className="mt-4 font-semibold text-white">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(`items.${key}.desc`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
