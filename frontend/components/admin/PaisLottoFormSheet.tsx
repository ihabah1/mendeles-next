"use client";

import {
  MARK_HEIGHT,
  MARK_WIDTH,
  PAIS_FORM_HEIGHT,
  PAIS_FORM_IMAGE,
  PAIS_FORM_WIDTH,
  marksForTable,
} from "@/lib/lotto/pais-form-coords";
import type { PreviewTable } from "./LottoFormPreview";

function Mark({ x, y }: { x: number; y: number }) {
  return (
    <rect
      x={x - MARK_WIDTH / 2}
      y={y - MARK_HEIGHT / 2}
      width={MARK_WIDTH}
      height={MARK_HEIGHT}
      fill="#1a1a2e"
      rx={0.5}
    />
  );
}

export default function PaisLottoFormSheet({
  tables,
  formIndex,
  drawDate,
  isDouble,
  customerName,
}: {
  tables: PreviewTable[];
  formIndex: number;
  drawDate?: string;
  isDouble?: boolean;
  customerName?: string;
}) {
  /** Row on the physical sheet is 1–14 per form, not global set_index. */
  const marks = tables.flatMap((t, idx) =>
    marksForTable(idx + 1, t.numbers, t.strong),
  );

  return (
    <div className="pais-form-sheet">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          fontSize: ".72rem",
          color: "var(--text2)",
        }}
      >
        <span style={{ fontWeight: 800, color: "var(--cream)" }}>
          טופס לוטו #{formIndex}
          {isDouble ? " · דאבל" : ""}
        </span>
        <span style={{ color: "var(--muted)" }}>
          {drawDate || "—"} · {tables.length} טבלאות מסומנות
        </span>
      </div>
      {customerName && (
        <div style={{ fontSize: ".65rem", color: "var(--muted)", marginBottom: 6 }}>
          {customerName}
        </div>
      )}
      <div
        className="pais-form-sheet-frame"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 380,
          margin: "0 auto",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 4px 18px rgba(0,0,0,.18)",
          border: "1px solid #d8d8d8",
          background: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PAIS_FORM_IMAGE}
          alt="טופס לוטו מפעל הפיס"
          style={{ width: "100%", height: "auto", display: "block" }}
          draggable={false}
        />
        <svg
          viewBox={`0 0 ${PAIS_FORM_WIDTH} ${PAIS_FORM_HEIGHT}`}
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          aria-hidden
        >
          {marks.map((m, i) => (
            <Mark key={`${m.x}-${m.y}-${i}`} x={m.x} y={m.y} />
          ))}
        </svg>
      </div>
      <p style={{ fontSize: ".58rem", color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
        סימולציה על טופס פיס · קו שחור = סימון הלקוח
      </p>
    </div>
  );
}
