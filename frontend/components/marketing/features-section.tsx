import { getTranslations } from "next-intl/server";

const ICONS = ["📄", "📊", "🔐", "⚡", "🎯", "🌐"];

export async function FeaturesSection() {
  const tl = await getTranslations("landing");
  const keys = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;

  return (
    <section id="features" className="border-t border-[var(--border)] bg-[var(--muted)]/40 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold tracking-tight">{tl("featuresTitle")}</h2>
        <p className="mt-2 max-w-2xl text-[var(--muted-fg)]">{tl("featuresSubtitle")}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, i) => (
            <article
              key={key}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm transition hover:border-[var(--accent)]/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-lg">
                {ICONS[i]}
              </div>
              <h3 className="mt-4 font-semibold">{tl(`${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-fg)]">{tl(`${key}Desc`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
