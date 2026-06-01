"use client";
import React from "react";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";

interface Fixture {
  id: number; home: string; away: string; league: string; date: string;
  p1: number | null; px: number | null; p2: number | null;
  score_h?: number; score_a?: number; weather?: string; status: string;
}

const RESULT_COLORS = { "1": "#1db96a", "X": "#c9a84c", "2": "#e8001e" };

export default function TotoPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [selections, setSelections] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/toto").then(r => r.json()).then(d => {
      setFixtures(d.fixtures || []);
      setIsDemo(d.demo);
      setLoading(false);
    });
  }, []);

  const toggleSel = (id: number, result: string) => {
    setSelections(prev => prev[id] === result ? { ...prev, [id]: "" } : { ...prev, [id]: result });
  };

  const filled = Object.values(selections).filter(Boolean).length;

  const getRecommendation = (f: Fixture) => {
    if (!f.p1) return null;
    const max = Math.max(f.p1, f.px || 0, f.p2 || 0);
    if (max === f.p1) return "1";
    if (max === f.px) return "X";
    return "2";
  };

  if (loading) return <><Nav /><div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>טוען נתונים...</div></>;

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 14px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.4rem", fontWeight: 900, color: "var(--cream)" }}>
            ⚽ ניתוח טוטו
          </h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isDemo && <span style={{ background: "rgba(232,160,48,.15)", border: "1px solid rgba(232,160,48,.3)", color: "#e8c870", borderRadius: 5, fontSize: ".68rem", fontWeight: 700, padding: "3px 8px" }}>🧪 DEMO</span>}
            <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>נבחרו: <strong style={{ color: "var(--gold)" }}>{filled}</strong>/{fixtures.length}</span>
          </div>
        </div>

        {/* טבלת משחקים */}
        <div style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 0 }}>
            {/* Header */}
            {["משחק", "1", "X", "2", "המלצה"].map(h => (
              <div key={h} style={{ padding: "10px 14px", background: "var(--navy-c)", borderBottom: "1px solid var(--navy-b)", fontSize: ".72rem", fontWeight: 700, color: "var(--muted)", textAlign: h !== "משחק" ? "center" : "right" }}>{h}</div>
            ))}

            {fixtures.map((f, i) => {
              const rec = getRecommendation(f);
              const isSel = (r: string) => selections[f.id] === r;
              return (
                <React.Fragment key={f.id}>
                  {/* משחק */}
                  <div style={{ padding: "12px 14px", borderBottom: i < fixtures.length - 1 ? "1px solid var(--navy-b)" : "none", display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--cream)" }}>
                      {f.weather && <span style={{ marginLeft: 6 }}>{f.weather}</span>}
                      {f.home} — {f.away}
                    </div>
                    <div style={{ fontSize: ".65rem", color: "var(--muted)", display: "flex", gap: 10 }}>
                      <span>{f.league}</span>
                      <span>{f.date}</span>
                      {f.score_h !== undefined && <span>צפי: {f.score_h?.toFixed(1)} – {f.score_a?.toFixed(1)}</span>}
                    </div>
                  </div>
                  {/* כפתורי בחירה */}
                  {(["1","X","2"] as const).map(r => (
                    <div key={`${f.id}-${r}`} style={{ padding: "12px 8px", borderBottom: i < fixtures.length - 1 ? "1px solid var(--navy-b)" : "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <button onClick={() => toggleSel(f.id, r)} style={{
                        width: 40, height: 36, borderRadius: 8,
                        border: `1.5px solid ${isSel(r) ? RESULT_COLORS[r] : "var(--navy-b)"}`,
                        background: isSel(r) ? RESULT_COLORS[r] : "transparent",
                        color: isSel(r) ? "#fff" : "var(--muted)",
                        fontFamily: "Heebo,sans-serif", fontSize: ".8rem", fontWeight: 700, cursor: "pointer",
                      }}>
                        <div>{r}</div>
                        {f.p1 !== null && <div style={{ fontSize: ".55rem", opacity: .7 }}>{r === "1" ? f.p1 : r === "X" ? f.px : f.p2}%</div>}
                      </button>
                    </div>
                  ))}
                  {/* המלצה */}
                  <div key={`rec-${f.id}`} style={{ padding: "12px 8px", borderBottom: i < fixtures.length - 1 ? "1px solid var(--navy-b)" : "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {rec && (
                      <span style={{ background: RESULT_COLORS[rec as keyof typeof RESULT_COLORS], color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: ".75rem", fontWeight: 700 }}>{rec}</span>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* סיכום */}
        {filled > 0 && (
          <div style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--gold)", borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
            <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--cream)", marginBottom: 10 }}>הבחירות שלך:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {fixtures.filter(f => selections[f.id]).map(f => (
                <div key={f.id} style={{ background: "var(--navy-c)", border: "1px solid var(--navy-b)", borderRadius: 8, padding: "5px 10px", fontSize: ".72rem" }}>
                  <span style={{ color: "var(--muted)" }}>{f.home} v {f.away}: </span>
                  <strong style={{ color: RESULT_COLORS[selections[f.id] as keyof typeof RESULT_COLORS] || "var(--gold)" }}>{selections[f.id]}</strong>
                </div>
              ))}
            </div>
            {filled === fixtures.length && (
              <div style={{ marginTop: 12, fontSize: ".76rem", color: "var(--green)", fontWeight: 700 }}>✅ כל המשחקים נבחרו! טופס מוכן להגשה.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
