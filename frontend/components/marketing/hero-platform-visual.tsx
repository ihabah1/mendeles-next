import Image from "next/image";
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
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="pointer-events-none absolute -inset-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,_rgba(109,40,217,0.4)_0%,_transparent_65%)]" />

      <div className="relative flex items-end justify-center gap-2 sm:gap-4">
        <div className="relative mb-2 hidden h-40 w-28 shrink-0 sm:block lg:h-52 lg:w-36">
          <Image
            src="/marketing/mascots/robot.png"
            alt=""
            fill
            className="object-contain drop-shadow-[0_20px_40px_rgba(99,102,241,0.45)]"
            sizes="144px"
            priority
          />
        </div>

        <div className="relative min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0f1528]/95 p-5 shadow-2xl shadow-indigo-950/50 backdrop-blur-sm sm:p-7">
          <div className="mb-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
            {t("label")}
          </div>

          <div className="flex items-center justify-between gap-1.5 sm:gap-3">
            {STEPS.slice(0, 2).map((key) => (
              <div key={key} className="flex flex-1 flex-col items-center gap-2 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-base sm:h-12 sm:w-12 sm:text-lg">
                  {STEP_ICONS[key]}
                </div>
                <span className="max-w-[4.5rem] text-[9px] font-medium leading-tight text-slate-400 sm:max-w-none sm:text-xs">
                  {t(`steps.${key}`)}
                </span>
              </div>
            ))}

            <div className="relative flex shrink-0 flex-col items-center">
              <div className="absolute inset-0 rounded-full bg-violet-500/45 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg shadow-violet-500/50 sm:h-16 sm:w-16">
                <span className="ms-0.5 text-xl text-white sm:text-2xl">▶</span>
              </div>
            </div>

            {STEPS.slice(2).map((key) => (
              <div key={key} className="flex flex-1 flex-col items-center gap-2 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-base sm:h-12 sm:w-12 sm:text-lg">
                  {STEP_ICONS[key]}
                </div>
                <span className="max-w-[4.5rem] text-[9px] font-medium leading-tight text-slate-400 sm:max-w-none sm:text-xs">
                  {t(`steps.${key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mb-6 hidden h-36 w-28 shrink-0 sm:block lg:h-44 lg:w-32">
          <Image
            src="/marketing/mascots/fox.png"
            alt=""
            fill
            className="object-contain drop-shadow-[0_20px_40px_rgba(139,92,246,0.4)]"
            sizes="128px"
            priority
          />
        </div>
      </div>
    </div>
  );
}
