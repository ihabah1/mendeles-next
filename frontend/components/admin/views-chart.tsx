type Point = { date: string; views: number };

export function ViewsChart({ data, label }: { data: Point[]; label: string }) {
  const max = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold">{label}</h3>
      <div className="mt-6 flex h-36 items-end gap-2">
        {data.map((point) => (
          <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-md bg-[var(--accent)]/80 transition-all"
              style={{ height: `${(point.views / max) * 100}%`, minHeight: 4 }}
              title={`${point.views}`}
            />
            <span className="text-[10px] text-[var(--muted-fg)]">{point.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
