"use client";

export type PrintSkipStep = "approve" | "claim" | "print" | "scan";

const SKIP_LABELS: Record<PrintSkipStep, string> = {
  approve: "דלג לאישור",
  claim: "דלג ללקיחה",
  print: "דלג להדפסה",
  scan: "דלג לסיום",
};

const SKIP_CONFIRM: Record<PrintSkipStep, string> = {
  approve: "לסמן את ההזמנה כאושרת בלי להדפיס?",
  claim: "לסמן כנלקחה על ידי סוכן (בלי הדפסה)?",
  print: "לדלג על ההדפסה ולסמן כהודפסה (ממתין לסריקה)?",
  scan: "לסמן כהושלמה בלי להעלות סריקה?",
};

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
  hasScan,
  jobStatus,
  orderStatus,
  onSkipStep,
  skipDisabled,
}: {
  orderCreatedAt?: string | null;
  createdAt?: string | null;
  approvedAt?: string | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  orderPrintedAt?: string | null;
  orderScannedAt?: string | null;
  hasScan?: boolean;
  jobStatus?: string;
  orderStatus?: string;
  onSkipStep?: (step: PrintSkipStep) => void;
  skipDisabled?: boolean;
}) {
  const printed = Boolean(completedAt || orderPrintedAt);
  const scanned = Boolean(orderScannedAt || hasScan);
  const cancelled = jobStatus === "cancelled";
  const completed = orderStatus === "completed";

  const steps: Array<{
    label: string;
    at: string | null | undefined;
    icon: string;
    done: boolean;
    skipStep?: PrintSkipStep;
  }> = [
    { label: "הזמנה", at: orderCreatedAt, icon: "📋", done: Boolean(orderCreatedAt) },
    { label: "בתור", at: createdAt, icon: "🕐", done: Boolean(createdAt) },
    {
      label: "אושר",
      at: approvedAt,
      icon: "✅",
      done: Boolean(approvedAt),
      skipStep: !approvedAt && !cancelled && !completed ? "approve" : undefined,
    },
    {
      label: "נלקח",
      at: claimedAt,
      icon: "📥",
      done: Boolean(claimedAt),
      skipStep: !claimedAt && !cancelled && !completed ? "claim" : undefined,
    },
    {
      label: "הודפס",
      at: completedAt || orderPrintedAt,
      icon: "🖨️",
      done: printed,
      skipStep: !printed && !cancelled && !completed ? "print" : undefined,
    },
    {
      label: "נסרק",
      at: orderScannedAt,
      icon: "📄",
      done: scanned,
      skipStep: !scanned && !cancelled && !completed ? "scan" : undefined,
    },
  ];

  const handleSkip = (step: PrintSkipStep) => {
    if (!onSkipStep) return;
    if (!window.confirm(SKIP_CONFIRM[step])) return;
    onSkipStep(step);
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px 14px",
        fontSize: ".72rem",
        color: "var(--muted)",
        padding: "10px 0 4px",
      }}
    >
      {steps.map((s) => (
        <div
          key={s.label}
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "4px 8px",
            borderRadius: 8,
            background: s.done ? "rgba(29,185,106,.06)" : "rgba(26,45,66,.35)",
            border: `1px solid ${s.done ? "rgba(29,185,106,.2)" : "var(--navy-b)"}`,
          }}
        >
          <span aria-hidden>{s.icon}</span>
          <span style={{ fontWeight: 700, color: s.done ? "var(--cream)" : "var(--muted)" }}>
            {s.label}
          </span>
          <span>{fmt(s.at)}</span>
          {s.skipStep && onSkipStep && (
            <button
              type="button"
              className="btn btn-outline"
              style={{
                fontSize: ".62rem",
                padding: "2px 8px",
                borderColor: "#8aaabe",
                color: "#8aaabe",
                marginInlineStart: 2,
              }}
              disabled={skipDisabled}
              title={SKIP_LABELS[s.skipStep]}
              onClick={() => handleSkip(s.skipStep!)}
            >
              ⏭ {SKIP_LABELS[s.skipStep]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
