"use client";

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

const ROWS = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  [31, 32, 33, 34, 35, 36, 37],
];
const STRONG = [1, 2, 3, 4, 5, 6, 7];

function TableRow({ table }: { table: PreviewTable }) {
  const nums = new Set(table.numbers);
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #ebebeb",
        background: "#fff",
        minHeight: 52,
      }}
    >
      <div
        style={{
          width: 22,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: ".55rem",
          fontWeight: 800,
          color: "#888",
          borderLeft: "1px solid #ebebeb",
        }}
      >
        {table.setIndex}
      </div>
      <div style={{ flex: 1, padding: "2px 3px", display: "flex", flexDirection: "column", gap: 1 }}>
        {ROWS.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 1 }}>
            {row.map((n) => {
              const isSel = nums.has(n);
              return (
                <span
                  key={n}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `1.5px solid ${isSel ? "#e8001e" : "#d5d5d5"}`,
                    background: isSel ? "#e8001e" : "#fff",
                    color: isSel ? "#fff" : "#333",
                    fontSize: ".52rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {n}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#fff5f5",
          borderRight: "1px solid #ffd0d0",
          width: 24,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2px 2px",
          gap: 1,
          justifyContent: "space-evenly",
        }}
      >
        <div style={{ fontSize: ".38rem", fontWeight: 900, color: "#e8001e" }}>חזק</div>
        {STRONG.map((n) => (
          <span
            key={n}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: `1.5px solid ${table.strong === n ? "#8b0000" : "#d5d5d5"}`,
              background: table.strong === n ? "#8b0000" : "#fff",
              color: table.strong === n ? "#fff" : "#333",
              fontSize: ".52rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {forms.map((form) => (
        <div
          key={form.formIndex}
          style={{
            border: "2px solid #d0d0d0",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fafafa",
            maxWidth: 420,
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#fff,#f5f5f5)",
              borderBottom: "2px solid #e8001e",
              padding: "6px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: ".72rem", fontWeight: 900, color: "#e8001e" }}>
              טופס לוטו #{form.formIndex}
              {isDouble ? " · דאבל" : ""}
            </span>
            <span style={{ fontSize: ".6rem", color: "#666" }}>
              {drawDate || "—"} · {form.tables.length} טבלאות
            </span>
          </div>
          {customerName && (
            <div
              style={{
                padding: "4px 10px",
                fontSize: ".65rem",
                color: "#444",
                borderBottom: "1px solid #eee",
                background: "#fff",
              }}
            >
              {customerName}
            </div>
          )}
          {form.tables.map((t) => (
            <TableRow key={t.setIndex} table={t} />
          ))}
          <div
            style={{
              background: "#f3f3f3",
              padding: "4px 10px",
              fontSize: ".58rem",
              color: "#888",
              textAlign: "left",
            }}
          >
            pais.co.il — סימולציה
          </div>
        </div>
      ))}
    </div>
  );
}
