"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth/AuthContext";
import { lottoService } from "@/lib/api/lotto";
import { tokenStore } from "@/lib/api/tokens";
import { isDemoMode } from "@/lib/demo";

const ROWS_777 = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
  [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  [51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
  [61, 62, 63, 64, 65, 66, 67, 68, 69, 70],
];

const PRIZES = [
  { hits: 7, prize: "₪70,000", color: "var(--gold-dark)" },
  { hits: 6, prize: "₪500", color: "var(--green)" },
  { hits: 5, prize: "₪50", color: "var(--heat-cold)" },
  { hits: 4, prize: "₪20", color: "var(--heat-cold)" },
  { hits: 3, prize: "₪5", color: "var(--heat-cold)" },
  { hits: 0, prize: "₪5", color: "var(--heat-cold)" },
];

type TableSel = Set<number>;

function Seven77Toast({ toast }: { toast: { msg: string; type: string } | null }) {
  if (!toast) return null;
  const kind = toast.type === "err" ? "err" : toast.type === "info" ? "info" : "ok";
  return (
    <div role="status" aria-live="polite" className={`toast toast-${kind}`}>
      {toast.msg}
    </div>
  );
}

export default function Seven77Page() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [tables, setTables] = useState<TableSel[]>([new Set(), new Set(), new Set()]);
  const [isPremium, setIsPremium] = useState(false);
  const [recs, setRecs] = useState<number[][]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [checkNums, setCheckNums] = useState(["", "", "", "", "", "", ""]);
  const [checkResult, setCheckResult] = useState<{
    status: string;
    message: string;
    checks?: { name: string; pass: boolean }[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (isDemoMode() || user?.email === "demo@mandeles.co.il") {
      setIsPremium(true);
      return;
    }
    if (!isAuthenticated) {
      setIsPremium(false);
      return;
    }
    lottoService
      .mySets()
      .then((d) => setIsPremium(d.tier === "premium"))
      .catch(() => setIsPremium(false));
  }, [isAuthenticated, user?.email]);

  const toggle = (tIdx: number, n: number) => {
    setTables((prev) => {
      const next = [...prev];
      const s = new Set(next[tIdx]);
      if (s.has(n)) s.delete(n);
      else if (s.size < 7) s.add(n);
      else {
        showToast("כבר 7 מספרים בטבלה", "err");
        return prev;
      }
      next[tIdx] = s;
      return next;
    });
  };

  const getRecs = async () => {
    if (!isPremium) return;
    setRecLoading(true);
    try {
      const token = tokenStore.getAccess();
      const r = await fetch("/api/seven77", {
        headers: {
          "x-premium": "1",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const d = await r.json();
      setRecs(d.sets || []);
      showToast(`✅ ${d.sets?.length || 0} המלצות נטענו (${d.passed_filter}/${d.total_checked} עברו סינון)`, "info");
    } catch {
      showToast("שגיאה בטעינת המלצות", "err");
    } finally {
      setRecLoading(false);
    }
  };

  const applyRec = (tIdx: number, nums: number[]) => {
    setTables((prev) => {
      const next = [...prev];
      next[tIdx] = new Set(nums);
      return next;
    });
    showToast(`⚡ טבלה ${tIdx + 1} מולאה`, "info");
  };

  const checkCombo = async () => {
    const nums = checkNums.map(Number).filter((n) => n >= 1 && n <= 70);
    if (nums.length !== 7 || new Set(nums).size !== 7) {
      setCheckResult({ status: "error", message: "⚠️ הזן 7 מספרים שונים (1-70)" });
      return;
    }
    setChecking(true);
    try {
      const r = await fetch("/api/seven77", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nums }),
      });
      const d = await r.json();
      setCheckResult(d);
    } catch {
      setCheckResult({ status: "error", message: "שגיאה בבדיקה" });
    } finally {
      setChecking(false);
    }
  };

  const clearTable = (tIdx: number) => {
    setTables((prev) => {
      const n = [...prev];
      n[tIdx] = new Set();
      return n;
    });
  };

  const filledCount = tables.filter((t) => t.size === 7).length;

  return (
    <>
      <Nav />
      <Seven77Toast toast={toast} />
      <div className="page-wrap">
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 900, color: "var(--gold-dark)" }}>
            777
          </div>
          <div style={{ fontSize: ".76rem", color: "var(--muted)", marginTop: 4 }}>
            7 מספרים מתוך 70 · פרס ראשון: ₪70,000 · הגרלה פעמיים ביום
          </div>
        </div>

        <div className="lotto-panel" style={{ marginBottom: 14 }}>
          <div className="lotto-panel-title" style={{ marginBottom: 10 }}>טבלת פרסים</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {PRIZES.map((p) => (
              <div key={p.hits} className="stat-card" style={{ textAlign: "center", padding: 10 }}>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: p.color }}>{p.prize}</div>
                <div style={{ fontSize: ".62rem", color: "var(--muted)", marginTop: 2 }}>
                  {p.hits === 0 ? "0 מספרים" : `${p.hits} מספרים`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`lotto-panel${isPremium ? " tier-premium" : ""}`} style={{ marginBottom: 14 }}>
          {isPremium ? (
            <>
              <div className="lotto-panel-title" style={{ color: "var(--gold-dark)", marginBottom: 6 }}>
                ⭐ המלצות מסוננות — Premium
              </div>
              <div className="lotto-panel-sub" style={{ marginBottom: 12, lineHeight: 1.6 }}>
                המנוע שלנו מריץ סינון תלת-שכבתי על אלפי צירופים ובוחר את הטובים ביותר עבורך.
              </div>
              {recs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {recs.map((nums, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        borderRadius: 9,
                        padding: "10px 14px",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {nums.map((n) => (
                          <span
                            key={n}
                            style={{
                              background: "var(--gold)",
                              color: "var(--navy)",
                              borderRadius: "50%",
                              width: 28,
                              height: 28,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: ".72rem",
                              fontWeight: 900,
                            }}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      {tables.length > i && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => applyRec(i, nums)}>
                          ⚡ טבלה {i + 1}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="btn btn-gold" onClick={getRecs} disabled={recLoading}>
                {recLoading ? "⏳ מריץ מנוע סינון..." : "🎯 קבל המלצות מסוננות"}
              </button>
            </>
          ) : (
            <>
              <div className="lotto-panel-title" style={{ marginBottom: 6 }}>🔒 המלצות מסוננות — Premium</div>
              <div className="lotto-panel-sub" style={{ marginBottom: 12, lineHeight: 1.6 }}>
                המנוע שלנו מריץ <strong>מסנן תלת-שכבתי</strong> על אלפי צירופים ומחזיר רק את הטובים ביותר.
              </div>
              <Link href="/auth" className="btn btn-gold" style={{ display: "inline-flex" }}>
                ⭐ הצטרף ל-Premium
              </Link>
            </>
          )}
        </div>

        <div className="lotto-panel" style={{ marginBottom: 14 }}>
          <div className="lotto-panel-title" style={{ marginBottom: 4 }}>🔍 בדיקת צירוף — חינם</div>
          <div className="lotto-panel-sub" style={{ marginBottom: 12 }}>
            הזן 7 מספרים (1–70) לבדיקה דרך המנוע
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 10 }}>
            {checkNums.map((v, i) => (
              <input
                key={i}
                type="number"
                min={1}
                max={70}
                value={v}
                inputMode="numeric"
                placeholder="–"
                onChange={(e) => {
                  const n = [...checkNums];
                  n[i] = e.target.value;
                  setCheckNums(n);
                }}
                className="input"
                style={{ textAlign: "center", padding: "8px 2px" }}
              />
            ))}
          </div>
          <button type="button" className="btn btn-gold btn-full" onClick={checkCombo} disabled={checking}>
            {checking ? "⏳ בודק..." : "🔍 בדוק צירוף"}
          </button>
          {checkResult && (
            <div
              className={checkResult.status === "approved" ? "result-pass" : "result-fail"}
              style={{ marginTop: 10 }}
            >
              <div
                style={{
                  fontSize: ".82rem",
                  fontWeight: 700,
                  marginBottom: 6,
                  color: checkResult.status === "approved" ? "var(--green)" : "var(--red)",
                }}
              >
                {checkResult.message}
              </div>
              {checkResult.checks?.map((c) => (
                <div
                  key={c.name}
                  style={{ fontSize: ".68rem", color: "var(--muted)", display: "flex", justifyContent: "space-between", padding: "2px 0" }}
                >
                  <span>{c.name}</span>
                  <span style={{ color: c.pass ? "var(--green)" : "var(--red)" }}>{c.pass ? "✓ עבר" : "✗ נכשל"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lotto-form-wrap" style={{ display: "flex", direction: "rtl", marginBottom: 14 }}>
          <div
            style={{
              background: "#1a3a6b",
              width: 36,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderLeft: "2px solid #0f2848",
            }}
          >
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                fontWeight: 900,
                letterSpacing: 3,
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              777
            </div>
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: ".42rem",
                color: "rgba(255,255,255,.6)",
                padding: "5px 0",
                borderTop: "1px solid #0f2848",
              }}
            >
              מפעל הפיס
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                background: "#1a3a6b",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#fff", fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 900 }}>
                777 — פיס
              </span>
              <span style={{ color: "rgba(255,255,255,.7)", fontSize: ".64rem" }}>7 מספרים מתוך 70</span>
            </div>
            {tables.map((tbl, ti) => (
              <div
                key={ti}
                style={{
                  borderBottom: ti < 2 ? "1px solid #e8e8e8" : "none",
                  background: tbl.size === 7 ? "#f5fff8" : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    background: "#eef2ff",
                    borderBottom: "1px solid #dde3f5",
                  }}
                >
                  <span
                    style={{
                      background: "#1a3a6b",
                      color: "#fff",
                      borderRadius: 5,
                      padding: "2px 8px",
                      fontSize: ".7rem",
                      fontWeight: 900,
                      marginLeft: 8,
                    }}
                  >
                    טבלה {ti + 1}
                  </span>
                  <span style={{ fontSize: ".64rem", color: "#888" }}>{tbl.size}/7 נבחרו</span>
                  <button
                    type="button"
                    onClick={() => clearTable(ti)}
                    style={{ marginRight: "auto", background: "none", border: "none", color: "#aaa", fontSize: ".62rem", cursor: "pointer" }}
                  >
                    ✕ נקה
                  </button>
                </div>
                <div style={{ padding: "6px 8px" }}>
                  {ROWS_777.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", gap: 3, marginBottom: 3 }}>
                      {row.map((n) => {
                        const sel = tbl.has(n);
                        const locked = tbl.size >= 7 && !sel;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => !locked && toggle(ti, n)}
                            style={{
                              width: 30,
                              height: 28,
                              borderRadius: 5,
                              border: `1.5px solid ${sel ? "#1a3a6b" : "#d5d5d5"}`,
                              background: sel ? "#1a3a6b" : "#fff",
                              color: sel ? "#fff" : "#333",
                              fontSize: ".62rem",
                              fontWeight: 700,
                              cursor: locked ? "default" : "pointer",
                              opacity: locked ? 0.25 : 1,
                              flexShrink: 0,
                              transition: "all .1s",
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div
              style={{
                background: "#f3f3f3",
                padding: "6px 12px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: ".64rem",
                color: "#555",
              }}
            >
              <span>{filledCount}/3 טבלאות מולאו</span>
              <span>pais.co.il</span>
            </div>
          </div>
        </div>

        <div className={`lotto-submit${filledCount > 0 ? " ready" : ""}`} style={{ marginBottom: 12 }}>
          <div className="lotto-panel-title" style={{ marginBottom: 6 }}>שליחה</div>
          <div className="lotto-panel-sub" style={{ marginBottom: 12 }}>
            {filledCount === 0 && "מלא לפחות טבלה אחת לשליחה"}
            {filledCount > 0 && (
              <>
                <strong style={{ color: "var(--green)" }}>{filledCount}</strong> טבלאות מולאו — ₪{filledCount * 7.5} לשליחה
              </>
            )}
          </div>
          <button
            type="button"
            className={`btn btn-full btn-lg ${filledCount > 0 ? "btn-green" : "btn-outline"}`}
            disabled={filledCount === 0}
            onClick={() => showToast("🚧 שליחת 777 בפיתוח — בקרוב!", "info")}
          >
            שלח {filledCount > 0 ? `${filledCount} טבלאות ✉️` : ""}
          </button>
          <div style={{ fontSize: ".63rem", color: "var(--muted)", textAlign: "center", marginTop: 7 }}>
            ₪7.5 לטבלה · הגרלה פעמיים ביום
          </div>
        </div>

        <button type="button" className="btn btn-outline" onClick={() => router.back()}>
          ← חזרה
        </button>
      </div>
    </>
  );
}
