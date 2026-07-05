import { Link } from "@/lib/i18n/navigation";

export function BlogLightFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Mendeles Insights — תובנות לצמיחה דיגיטלית</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/company" className="transition hover:text-[#5e35b1]">
            אודות
          </Link>
          <Link href="/blog" className="transition hover:text-[#5e35b1]">
            בלוג
          </Link>
          <Link href="/accessibility" className="transition hover:text-[#5e35b1]">
            נגישות
          </Link>
        </div>
      </div>
    </footer>
  );
}
