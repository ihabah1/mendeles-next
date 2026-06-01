"use client";
import { useEffect, useState } from "react";

interface WinStats { [rank: string]: number }
interface Prize { name: string; ils: number }
interface StatsData {
  total_users: number;
  total_orders: number;
  last_draw: { date: string; numbers: number[]; strong: number } | null;
  prizes: Record<string, Prize> | null;
  win_stats: WinStats;
  total_winners: number;
  total_prize: number;
}

const RANK_LABELS: Record<string, string> = {
  "6+strong": "6 + חזק 🏆",
  "6":        "6 מספרים 🥇",
  "5+strong": "5 + חזק 🥈",
  "5":        "5 מספרים 🥉",
  "4+strong": "4 + חזק",
  "4":        "4 מספרים",
  "3+strong": "3 + חזק",
  "3":        "3 מספרים",
};

const RANK_ORDER = ["6+strong","6","5+strong","5","4+strong","4","3+strong","3"];

export default function StatsWidget() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats").then(r => r.ok ? r.json() : null).then(d => d && setData(d)).catch(() => {});
  }, []);

  if (!data) return (
    <div style={{ background: "rgba(26,45,66,.6)", border: "1px solid var(--navy-b)", borderRadius: 14, padding: "24px", margin: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: ".78rem" }}>
      טוען נתונים...
    </div>
  );

  const hasWins = data.total_winners > 0;

  return (
    <div style={{ margin: "20px 0" }}>
      {/* כרטיסי סטטיסטיקה */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "טפסים שהוגשו", value: data.total_orders.toLocaleString(), icon: "📋" },
          { label: "זוכים סה״כ", value: data.total_winners.toLocaleString(), icon: "🏆" },
          { label: "פרסים שחולקו", value: `₪${data.total_prize.toLocaleString()}`, icon: "💰" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.3rem", fontWeight: 900, color: "var(--gold)" }}>{s.value}</div>
            <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* הגרלה אחרונה */}
      {data.last_draw && (
        <div style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 14, padding: "20px", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1rem", fontWeight: 900, color: "var(--cream)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>🎱 הגרלה אחרונה</span>
            <span style={{ fontSize: ".72rem", color: "var(--muted)", fontFamily: "Heebo,sans-serif", fontWeight: 400 }}>{data.last_draw.date}</span>
          </div>

          {/* מספרים זוכים */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            {data.last_draw.numbers.map(n => (
              <div key={n} style={{ width: 38, height: 38, borderRadius: "50%", background: "#e8001e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: ".88rem", boxShadow: "0 2px 8px rgba(232,0,30,.4)" }}>{n}</div>
            ))}
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--muted)" }} />
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#8b0000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: ".88rem", boxShadow: "0 2px 8px rgba(139,0,0,.4)" }}>
              {data.last_draw.strong}
            </div>
            <span style={{ fontSize: ".68rem", color: "var(--muted)" }}>חזק</span>
          </div>

          {/* טבלת זכיות */}
          {hasWins ? (
            <>
              <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--cream)", marginBottom: 10 }}>
                זכיות לקוחות Mandeles בהגרלה זו:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 16px", fontSize: ".74rem" }}>
                <div style={{ color: "var(--muted)", fontWeight: 700, borderBottom: "1px solid var(--navy-b)", paddingBottom: 6 }}>דרגה</div>
                <div style={{ color: "var(--muted)", fontWeight: 700, borderBottom: "1px solid var(--navy-b)", paddingBottom: 6, textAlign: "center" }}>זוכים</div>
                <div style={{ color: "var(--muted)", fontWeight: 700, borderBottom: "1px solid var(--navy-b)", paddingBottom: 6, textAlign: "left" }}>פרס</div>
                {RANK_ORDER.filter(r => data.win_stats[r] > 0).map(rank => (
                  <>
                    <div key={`n-${rank}`} style={{ color: "var(--cream)", padding: "4px 0" }}>{RANK_LABELS[rank]}</div>
                    <div key={`c-${rank}`} style={{ color: "var(--gold)", fontWeight: 700, textAlign: "center", padding: "4px 0" }}>{data.win_stats[rank]}</div>
                    <div key={`p-${rank}`} style={{ color: "var(--green)", textAlign: "left", padding: "4px 0" }}>
                      {data.prizes?.[rank]?.ils ? `₪${data.prizes[rank].ils.toLocaleString()}` : "—"}
                    </div>
                  </>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: ".76rem", color: "var(--muted)", textAlign: "center", padding: "10px 0" }}>
              תוצאות הגרלה זו יחושבו בקרוב
            </div>
          )}
        </div>
      )}
    </div>
  );
}
