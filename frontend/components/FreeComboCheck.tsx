"use client";
import { useState } from "react";

const RANK_LABELS: Record<string, string> = {
  "6+strong": "6 + חזק 🏆",
  "6": "6 מספרים 🥇",
  "5+strong": "5 + חזק 🥈",
  "5": "5 מספרים 🥉",
  "4+strong": "4 + חזק",
  "4": "4 מספרים",
  "3+strong": "3 + חזק",
  "3": "3 מספרים",
};

function calcRank(nums: number[], strong: number, drawNums: number[], drawStrong: number): string | null {
  const hits = nums.filter(n => drawNums.includes(n)).length;
  const strongHit = strong === drawStrong;
  if (hits === 6 && strongHit) return "6+strong";
  if (hits === 6) return "6";
  if (hits === 5 && strongHit) return "5+strong";
  if (hits === 5) return "5";
  if (hits === 4 && strongHit) return "4+strong";
  if (hits === 4) return "4";
  if (hits === 3 && strongHit) return "3+strong";
  if (hits === 3) return "3";
  return null;
}

export default function FreeComboCheck() {
  const [nums, setNums] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [strong, setStrong] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const setNum = (idx: number, val: string) => {
    const n = val === "" ? null : parseInt(val, 10);
    if (n !== null && (isNaN(n) || n < 1 || n > 37)) return;
    setNums(prev => {
      const next = [...prev];
      next[idx] = n;
      return next;
    });
    setResult(null);
  };

  const setStrongNum = (val: string) => {
    const n = val === "" ? null : parseInt(val, 10);
    if (n !== null && (isNaN(n) || n < 1 || n > 7)) return;
    setStrong(n);
    setResult(null);
  };

  const check = async () => {
    const filled = nums.filter(n => n !== null) as number[];
    if (filled.length !== 6 || strong === null) {
      setResult("הזן 6 מספרים (1–37) ומספר חזק (1–7)");
      return;
    }
    if (new Set(filled).size !== 6) {
      setResult("כל 6 המספרים חייבים להיות שונים");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/stats");
      const data = res.ok ? await res.json() : null;
      if (!data?.last_draw) {
        setResult("אין נתוני הגרלה זמינים כרגע");
        return;
      }
      const { numbers, strong: drawStrong, date } = data.last_draw;
      const rank = calcRank(filled, strong, numbers, drawStrong);
      const hits = filled.filter(n => numbers.includes(n)).length;
      const strongHit = strong === drawStrong;
      if (rank) {
        setResult(`🎉 בהגרלה ${date}: ${RANK_LABELS[rank]}${data.prizes?.[rank]?.ils ? ` — פרס ₪${data.prizes[rank].ils.toLocaleString()}` : ""}`);
      } else {
        setResult(`בהגרלה ${date}: ${hits} פגיעות${strongHit ? " + חזק" : ""} — לא זכית`);
      }
    } catch {
      setResult("שגיאה בבדיקה — נסה שוב");
    } finally {
      setChecking(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid var(--navy-b)",
    background: "var(--navy)",
    color: "var(--cream)",
    fontFamily: "Heebo,sans-serif",
    fontSize: ".85rem",
    fontWeight: 700,
    textAlign: "center",
    outline: "none",
  };

  return (
    <div style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 14, padding: "20px 18px", margin: "20px 0" }}>
      <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1rem", fontWeight: 900, color: "var(--cream)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
        <span>🔍</span> בדיקת צירוף – חינם
      </div>
      <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 14 }}>(1–37) הזן 6 מספרים</div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
        {nums.map((n, i) => (
          <input
            key={i}
            type="number"
            min={1}
            max={37}
            value={n ?? ""}
            onChange={e => setNum(i, e.target.value)}
            placeholder="–"
            style={inputStyle}
          />
        ))}
        <input
          type="number"
          min={1}
          max={7}
          value={strong ?? ""}
          onChange={e => setStrongNum(e.target.value)}
          placeholder="ח"
          title="מספר חזק (1–7)"
          style={{ ...inputStyle, borderColor: "rgba(232,0,30,.4)" }}
        />
      </div>
      <button
        type="button"
        onClick={check}
        disabled={checking}
        className="btn btn-gold"
        style={{ width: "100%", justifyContent: "center", padding: "11px 16px", fontSize: ".88rem" }}
      >
        {checking ? "בודק..." : "🔍 בדוק צירוף"}
      </button>
      {result && (
        <div style={{ marginTop: 12, fontSize: ".78rem", color: result.includes("🎉") ? "var(--green)" : "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
          {result}
        </div>
      )}
    </div>
  );
}
