import { getTranslations } from "next-intl/server";

const STEPS = ["keyword", "content", "publish", "convert"] as const;

const STEP_ICONS: Record<(typeof STEPS)[number], string> = {
  keyword: "🔍",
  content: "✨",
  publish: "🚀",
  convert: "👤",
};

export async function HeroPlatformVisual() {
  const t = await getTranslations("landing.platformOverview");

  return (
    <div className="relative" aria-hidden="true">
      <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.35)_0%,_transparent_70%)]" />
      <div className="relative rounded-2xl border border-white/10 bg-[#0f1528]/90 p-6 shadow-2xl shadow-indigo-950/50 backdrop-blur-sm sm:p-8">
        <div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span className="h-2 w-2 rounded-full bg-indigo-400" />
          {t("label")}
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {STEPS.slice(0, 2).map((key) => (
            <div key={key} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg">
                {STEP_ICONS[key]}
              </div>
              <span className="max-w-[5rem] text-[10px] font-medium leading-tight text-slate-400 sm:max-w-none sm:text-xs">
                {t(`steps.${key}`)}
              </span>
            </div>
          ))}

          <div className="relative flex shrink-0 flex-col items-center">
            <div className="absolute inset-0 rounded-full bg-indigo-500/40 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg shadow-indigo-500/50 sm:h-20 sm:w-20">
              <span className="ms-0.5 text-2xl text-white">▶</span>
            </div>
          </div>

          {STEPS.slice(2).map((key) => (
            <div key={key} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg">
                {STEP_ICONS[key]}
              </div>
              <span className="max-w-[5rem] text-[10px] font-medium leading-tight text-slate-400 sm:max-w-none sm:text-xs">
                {t(`steps.${key}`)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-white/10 bg-[#0a0f1e]/80 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-lg">
            📈
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t("journeyTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t("journeyDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
