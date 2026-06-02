"use client";
import { Fragment, useEffect, useState } from "react";

interface WinStats { [rank: string]: number }
interface Prize { name: string; ils: number }
interface StatsData {
  total_orders: number;
  last_draw: { date: string; numbers: number[]; strong: number } | null;
  prizes: Record<string, Prize> | null;
  win_stats: WinStats;
  total_winners: number;
  total_prize: number;
}

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

const RANK_ORDER = ["6+strong", "6", "5+strong", "5", "4+strong", "4", "3+strong", "3"];

export default function StatsWidget() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setData(d))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <section className="home-card" style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.76rem" }}>
        טוען נתונים...
      </section>
    );
  }

  const hasWins = data.total_winners > 0;

  return (
    <section className="home-card">
      <h2 className="home-section-title" style={{ marginBottom: 12 }}>
        <span aria-hidden>📈</span>
        <span>נתונים ותוצאות</span>
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: data.last_draw ? 16 : 0,
        }}
      >
        {[
          { label: "טפסים", value: data.total_orders.toLocaleString(), icon: "📋" },
          { label: "זוכים", value: data.total_winners.toLocaleString(), icon: "🏆" },
          { label: "פרסים", value: `₪${data.total_prize.toLocaleString()}`, icon: "💰" },
        ].map(s => (
          <div key={s.label} className="home-stat-pill">
            <div style={{ fontSize: "0.9rem", marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1rem", fontWeight: 900, color: "var(--gold)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {data.last_draw && (
        <div style={{ borderTop: "1px solid var(--navy-b)", paddingTop: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--cream)",
            }}
          >
            <span>🎱 הגרלה אחרונה</span>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 400 }}>{data.last_draw.date}</span>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: hasWins ? 12 : 0 }}>
            {data.last_draw.numbers.map(n => (
              <div
                key={n}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#e8001e",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.78rem",
                }}
              >
                {n}
              </div>
            ))}
            <span style={{ color: "var(--muted)", fontSize: "0.65rem" }}>|</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#8b0000",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "0.78rem",
              }}
            >
              {data.last_draw.strong}
            </div>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>חזק</span>
          </div>

          {hasWins ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "4px 12px", fontSize: "0.7rem" }}>
              <div style={{ color: "var(--muted)", fontWeight: 700, borderBottom: "1px solid var(--navy-b)", paddingBottom: 4 }}>דרגה</div>
              <div style={{ color: "var(--muted)", fontWeight: 700, borderBottom: "1px solid var(--navy-b)", paddingBottom: 4, textAlign: "center" }}>זוכים</div>
              <div style={{ color: "var(--muted)", fontWeight: 700, borderBottom: "1px solid var(--navy-b)", paddingBottom: 4, textAlign: "left" }}>פרס</div>
              {RANK_ORDER.filter(r => data.win_stats[r] > 0).map(rank => (
                <Fragment key={rank}>
                  <div style={{ color: "var(--cream)", padding: "3px 0" }}>{RANK_LABELS[rank]}</div>
                  <div style={{ color: "var(--gold)", fontWeight: 700, textAlign: "center", padding: "3px 0" }}>{data.win_stats[rank]}</div>
                  <div style={{ color: "var(--green)", textAlign: "left", padding: "3px 0" }}>
                    {data.prizes?.[rank]?.ils ? `₪${data.prizes[rank].ils.toLocaleString()}` : "—"}
                  </div>
                </Fragment>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
              תוצאות הגרלה זו יחושבו בקרוב
            </div>
          )}
        </div>
      )}
    </section>
  );
}
