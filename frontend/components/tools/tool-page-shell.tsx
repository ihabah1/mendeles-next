import { Link } from "@/lib/i18n/navigation";
import { toolsCopy } from "@/lib/tools/copy";
import type { ReactNode } from "react";

type Props = {
  locale: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolPageShell({ locale, title, description, children }: Props) {
  const copy = toolsCopy(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav className="mb-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/blog" className="text-slate-500 hover:text-[#6F42F5]">
          {copy.backToBlog}
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/blog/tools" className="text-slate-500 hover:text-[#6F42F5]">
          {copy.backToTools}
        </Link>
      </nav>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
        <p className="mt-2 text-xs text-slate-400">{copy.disclaimer}</p>
      </header>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
        {children}
      </div>
    </div>
  );
}
