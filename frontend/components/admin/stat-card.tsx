import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  accent?: boolean;
};

export function StatCard({ label, value, hint, trend, accent }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm",
        accent && "border-[var(--accent)]/30 bg-[var(--accent-muted)]/30",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {(hint || trend) && (
        <p className="mt-1 text-xs text-[var(--muted-fg)]">
          {trend && <span className="text-[var(--success)]">{trend} </span>}
          {hint}
        </p>
      )}
    </div>
  );
}
