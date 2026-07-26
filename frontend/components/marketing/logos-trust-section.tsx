import { getTranslations } from "next-intl/server";

const LOGO_LABELS = ["Nimbus", "Orbit", "Pixel", "Nova", "Leaf", "Stack"] as const;

export async function LogosTrustSection() {
  const t = await getTranslations("landing.logosTrust");

  return (
    <section className="border-y border-white/5 px-6 py-14" aria-labelledby="logos-trust-title">
      <div className="mx-auto max-w-7xl">
        <h2 id="logos-trust-title" className="text-center text-sm font-medium tracking-wide text-slate-400">
          {t("title")}
        </h2>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-70 grayscale">
          {LOGO_LABELS.map((label) => (
            <li key={label} className="flex items-center gap-2 text-slate-300">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-[10px] font-bold"
                aria-hidden="true"
              >
                {label.slice(0, 1)}
              </span>
              <span className="text-sm font-semibold tracking-tight">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
