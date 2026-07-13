import { Link } from "@/lib/i18n/navigation";
import { TOOLS } from "@/lib/tools/catalog";
import { toolsCopy } from "@/lib/tools/copy";

type Props = {
  locale: string;
  compact?: boolean;
};

export function ToolsMenu({ locale, compact = false }: Props) {
  const copy = toolsCopy(locale);

  return (
    <section
      id="useful-tools"
      className={
        compact
          ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          : "scroll-mt-28 rounded-3xl border border-[#6F42F5]/15 bg-gradient-to-br from-[#F8F5FF] to-white p-5 shadow-[0_8px_28px_rgba(111,66,245,0.08)] sm:p-7"
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{copy.menuTitle}</h2>
          {!compact ? <p className="mt-1 text-sm text-slate-600">{copy.hubSubtitle}</p> : null}
        </div>
        <Link href="/blog/tools" className="text-sm font-bold text-[#6F42F5] hover:underline">
          {copy.backToTools} →
        </Link>
      </div>
      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {TOOLS.map((tool) => {
          const meta = copy.tools[tool.slug];
          return (
            <Link
              key={tool.slug}
              href={`/blog/tools/${tool.slug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#6F42F5]/40 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6F42F5]/10 text-lg">
                  {tool.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-[#6F42F5]">{meta.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{meta.short}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
