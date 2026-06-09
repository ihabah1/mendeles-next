"use client";

export type TriFilter = boolean | null;

function chipStyle(active: boolean) {
  return {
    padding: "5px 12px",
    borderRadius: 20,
    border: `1px solid ${active ? "var(--gold)" : "var(--navy-b)"}`,
    background: active ? "rgba(201,168,76,.15)" : "transparent",
    color: active ? "var(--gold)" : "var(--muted)",
    fontFamily: "Heebo,sans-serif",
    fontSize: ".7rem",
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

export default function DocFilterChips({
  hasScan,
  hasInvoice,
  onScanChange,
  onInvoiceChange,
}: {
  hasScan: TriFilter;
  hasInvoice: TriFilter;
  onScanChange: (v: TriFilter) => void;
  onInvoiceChange: (v: TriFilter) => void;
}) {
  const toggle = (current: TriFilter, next: boolean, onChange: (v: TriFilter) => void) => {
    onChange(current === next ? null : next);
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <span style={{ fontSize: ".68rem", color: "var(--muted)", alignSelf: "center" }}>סינון:</span>
      <button
        type="button"
        style={chipStyle(hasScan === true)}
        onClick={() => toggle(hasScan, true, onScanChange)}
      >
        📄 עם סריקה
      </button>
      <button
        type="button"
        style={chipStyle(hasScan === false)}
        onClick={() => toggle(hasScan, false, onScanChange)}
      >
        📄 ללא סריקה
      </button>
      <button
        type="button"
        style={chipStyle(hasInvoice === true)}
        onClick={() => toggle(hasInvoice, true, onInvoiceChange)}
      >
        🧾 עם חשבונית
      </button>
      <button
        type="button"
        style={chipStyle(hasInvoice === false)}
        onClick={() => toggle(hasInvoice, false, onInvoiceChange)}
      >
        🧾 ללא חשבונית
      </button>
    </div>
  );
}
