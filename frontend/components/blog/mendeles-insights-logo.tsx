import { Link } from "@/lib/i18n/navigation";

type Props = {
  className?: string;
  showWordmark?: boolean;
};

export function MendelesInsightsLogo({ className = "", showWordmark = true }: Props) {
  return (
    <Link href="/blog" className={`inline-flex items-center gap-3 ${className}`} aria-label="Mendeles Insights">
      <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0" aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="12" fill="#6F42F5" />
        <path d="M14 32V16h5.2l4.4 9.2L28 16h5v16h-4.2V24.8L24.8 32h-2.8l-3.8-7.2V32H14z" fill="white" />
        <rect x="30" y="28" width="3" height="8" rx="1" fill="#C4B5FD" />
        <rect x="34" y="24" width="3" height="12" rx="1" fill="#DDD6FE" />
        <rect x="38" y="20" width="3" height="16" rx="1" fill="white" />
      </svg>
      {showWordmark ? (
        <span className="text-xl font-bold tracking-tight text-slate-900">
          Mendeles <span className="font-semibold text-[#6F42F5]">Insights</span>
        </span>
      ) : null}
    </Link>
  );
}
