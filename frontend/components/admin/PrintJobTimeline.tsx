"use client";

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PrintJobTimeline({
  orderCreatedAt,
  createdAt,
  approvedAt,
  claimedAt,
  completedAt,
  orderPrintedAt,
  orderScannedAt,
}: {
  orderCreatedAt?: string | null;
  createdAt?: string | null;
  approvedAt?: string | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  orderPrintedAt?: string | null;
  orderScannedAt?: string | null;
}) {
  const steps = [
    { label: "הזמנה", at: orderCreatedAt, icon: "📋" },
    { label: "בתור", at: createdAt, icon: "🕐" },
    { label: "אושר", at: approvedAt, icon: "✅" },
    { label: "נלקח", at: claimedAt, icon: "📥" },
    { label: "הודפס", at: completedAt || orderPrintedAt, icon: "🖨️" },
    { label: "נסרק", at: orderScannedAt, icon: "📄" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 16px",
        fontSize: ".72rem",
        color: "var(--muted)",
        padding: "10px 0 4px",
      }}
    >
      {steps.map((s) => (
        <div key={s.label} style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span aria-hidden>{s.icon}</span>
          <span style={{ fontWeight: 700, color: s.at ? "var(--cream)" : "var(--muted)" }}>{s.label}</span>
          <span>{fmt(s.at)}</span>
        </div>
      ))}
    </div>
  );
}
