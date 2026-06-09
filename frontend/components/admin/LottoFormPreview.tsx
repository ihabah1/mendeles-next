"use client";

import PaisLottoFormSheet from "./PaisLottoFormSheet";

export interface PreviewTable {
  setIndex: number;
  numbers: number[];
  strong: number;
  display?: string;
}

export interface PreviewForm {
  formIndex: number;
  tables: PreviewTable[];
}

export default function LottoFormPreview({
  forms,
  drawDate,
  isDouble,
  customerName,
}: {
  forms: PreviewForm[];
  drawDate?: string;
  isDouble?: boolean;
  customerName?: string;
}) {
  if (!forms.length) {
    return <p style={{ fontSize: ".78rem", color: "var(--muted)" }}>אין נתוני טופס</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {forms.map((form) => (
        <PaisLottoFormSheet
          key={form.formIndex}
          formIndex={form.formIndex}
          tables={form.tables}
          drawDate={drawDate}
          isDouble={isDouble}
          customerName={customerName}
        />
      ))}
    </div>
  );
}
