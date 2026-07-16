import { Link } from "@/lib/i18n/navigation";
import { TOOLS, type ToolSlug } from "@/lib/tools/catalog";
import { toolsCopy } from "@/lib/tools/copy";
import type { ToolSeoContent } from "@/lib/tools/seo-content";

type Props = {
  locale: string;
  slug: ToolSlug;
  content: ToolSeoContent;
};

export function ToolSeoContentSection({ locale, slug, content }: Props) {
  const copy = toolsCopy(locale);
  const isHebrew = locale === "he";
  const related = TOOLS.filter((tool) => tool.slug !== slug).slice(0, 4);

  return (
    <section className="mt-10 space-y-8 text-slate-700" aria-labelledby="tool-guide-title">
      <div>
        <h2 id="tool-guide-title" className="text-2xl font-extrabold text-slate-900">
          {isHebrew ? `איך הכלי ${copy.tools[slug].title} עוזר לכם?` : `How ${copy.tools[slug].title} helps`}
        </h2>
        <p className="mt-3 text-base leading-8">{content.intro}</p>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-slate-900">
          {isHebrew ? "יתרונות ושימושים נפוצים" : "Benefits and common uses"}
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {content.benefits.map((benefit) => (
            <li key={benefit} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold shadow-sm">
              <span className="me-2 text-emerald-600" aria-hidden="true">✓</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-slate-900">
          {isHebrew ? "שאלות נפוצות" : "Frequently asked questions"}
        </h2>
        <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
          {content.faq.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="cursor-pointer list-none font-bold text-slate-900">
                {item.question}
                <span className="float-end text-[#6F42F5] group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-slate-900">
          {isHebrew ? "כלים שימושיים נוספים" : "More useful tools"}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {related.map((tool) => (
            <Link
              key={tool.slug}
              href={`/blog/tools/${tool.slug}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#6F42F5] hover:border-[#6F42F5]/50"
            >
              {tool.icon} {copy.tools[tool.slug].title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
