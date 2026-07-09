type Point = { value: number };

export function MiniSparkline({ data, color = "#7c4dff" }: { data: Point[]; color?: string }) {
  if (data.length === 0) return null;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" points={points} />
    </svg>
  );
}

export function ActivityChart({
  data,
  loginColor = "#7c4dff",
  eventColor = "#2979ff",
}: {
  data: Array<{ date: string; logins: number; events: number }>;
  loginColor?: string;
  eventColor?: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.flatMap((d) => [d.logins, d.events]), 1);
  const w = 600;
  const h = 160;
  const pad = 8;

  function line(values: number[], color: string) {
    const points = values
      .map((v, i) => {
        const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
    return <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" points={points} />;
  }

  const logins = data.map((d) => d.logins);
  const events = data.map((d) => d.events);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" role="img">
      {line(events, eventColor)}
      {line(logins, loginColor)}
    </svg>
  );
}
