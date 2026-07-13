import { isRtlLocale } from "@/lib/i18n/locale-content";
import { Link } from "@/lib/i18n/navigation";
import { editorialCopy } from "@/lib/blog/editorial-copy";

export function DemoNotice({ locale = "he" }: { locale?: string }) {
  const copy = editorialCopy(locale);
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white px-5 py-4 shadow-sm">
      <p className={`text-sm font-bold text-amber-900 ${isRtlLocale(locale) ? "text-right" : "text-left"}`}>{copy.demoNoticeTitle}</p>
      <p className={`mt-1 text-sm leading-7 text-amber-800/90 ${isRtlLocale(locale) ? "text-right" : "text-left"}`}>
        {copy.demoNoticeBody}{" "}
        <Link href="/dashboard/workspace" className="font-semibold text-[#6F42F5] underline-offset-2 hover:underline">
          {copy.demoNoticeLink}
        </Link>
        .
      </p>
    </div>
  );
}
