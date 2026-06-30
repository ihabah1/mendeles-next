import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function MarketingLogo({ className }: Props) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/30"
        aria-hidden="true"
      >
        M
      </span>
      <span className="text-lg font-bold tracking-tight text-white">Mendeles</span>
    </Link>
  );
}
