"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminUI";
import { useAuth } from "@/lib/auth/AuthContext";
import { adminService } from "@/lib/api/admin";
import { extractApiError } from "@/lib/api/client";

interface Stats {
  total_users: number;
  new_today: number;
  active_subs: number;
  pending_orders: number;
  total_revenue: number;
  total_wins: number;
  total_prize: number;
}

export default function AdminPage() {
  return <AdminPageInner />;
}

function AdminPageInner() {
  const { isAdmin, isStaff } = useAuth();
  const canManageOrders = isAdmin || isStaff;
  const [legacyToken, setLegacyToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [winDate, setWinDate] = useState(new Date().toISOString().slice(0, 10));
  const [winNums, setWinNums] = useState("");
  const [winStrong, setWinStrong] = useState("");
  const [winResult, setWinResult] = useState<{ wins: number; total_prize_ils: number } | null>(
    null,
  );
  const [drawDate, setDrawDate] = useState(new Date().toISOString().slice(0, 10));
  const [drawNums2, setDrawNums2] = useState("");
  const [drawStrong2, setDrawStrong2] = useState("");
  const [drawPrizes, setDrawPrizes] = useState({
    "6+strong": 5000000,
    "6": 500000,
    "5+strong": 50000,
    "5": 5000,
    "4+strong": 500,
    "4": 50,
    "3+strong": 56,
    "3": 15,
  });
  const [paisLotteryId, setPaisLotteryId] = useState("");
  const [paisLoading, setPaisLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = "ok", ms = 2800) => {
    setToast({ msg, type });
    if (ms > 0) setTimeout(() => setToast(null), ms);
  }, []);

  const legacyAdminHeader = (): Record<string, string> =>
    legacyToken ? { "x-admin-token": legacyToken } : {};

  const fetchFromPais = async () => {
    setPaisLoading(true);
    try {
      if (canManageOrders) {
        const d = await adminService.refreshDraw(paisLotteryId || undefined);
        const ld = d.last_draw;
        setDrawNums2(ld.numbers?.join(", ") || "");
        setDrawStrong2(String(ld.strong || ""));
        setDrawDate(ld.date || drawDate);
        if (d.prizes) {
          const p: Record<string, number> = {};
          Object.entries(d.prizes).forEach(([k, v]) => {
            p[k] = v.ils || 0;
          });
          setDrawPrizes((prev) => ({ ...prev, ...p }));
        }
        alert(`✅ נטענו ושמרנו הגרלה ${ld.lottery_id} מפיס`);
        return;
      }
      const url = paisLotteryId ? `/api/pais?id=${paisLotteryId}` : "/api/pais";
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) {
        alert("❌ " + d.error);
        return;
      }
      setDrawNums2(d.numbers?.join(", ") || "");
      setDrawStrong2(String(d.strong || ""));
      setDrawDate(d.date || drawDate);
      if (d.prizes) {
        const p: Record<string, number> = {};
        Object.entries(d.prizes).forEach(([k, v]: [string, unknown]) => {
          p[k] = (v as { ils: number }).ils || 0;
        });
        setDrawPrizes((prev) => ({ ...prev, ...p }));
      }
      alert(`✅ נטענו נתוני הגרלה ${d.lottery_id}`);
    } catch (e) {
      alert("❌ " + extractApiError(e, "שגיאה בטעינה מפיס"));
    } finally {
      setPaisLoading(false);
    }
  };

  const saveDraw = async () => {
    const nums = drawNums2.split(/[\s,]+/).map(Number).filter((n) => n >= 1 && n <= 37);
    const strong2 = parseInt(drawStrong2);
    if (nums.length !== 6) {
      alert("נדרשים 6 מספרים");
      return;
    }
    if (!strong2 || strong2 < 1 || strong2 > 7) {
      alert("חזק צריך להיות 1-7");
      return;
    }
    const prizes2 = Object.fromEntries(
      Object.entries(drawPrizes).map(([k, ils]) => [k, { name: k, ils }]),
    );
    const r = await fetch("/api/pais", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...legacyAdminHeader() },
      body: JSON.stringify({
        lottery_id: paisLotteryId,
        date: drawDate,
        numbers: nums,
        strong: strong2,
        prizes: prizes2,
      }),
    });
    const d = await r.json();
    if (r.ok) alert("✅ תוצאות נשמרו!");
    else alert("❌ " + d.error);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (canManageOrders) {
        const s = await adminService.stats();
        setStats(s);
      } else if (legacyToken) {
        const s = await fetch("/api/admin/stats", { headers: legacyAdminHeader() }).then((r) =>
          r.ok ? r.json() : null,
        );
        setStats(s);
      }
    } finally {
      setLoading(false);
    }
  }, [canManageOrders, legacyToken]);

  const checkWins = async (dryRun = false) => {
    if (canManageOrders) {
      try {
        const d = await adminService.checkWins({ dry_run: dryRun });
        setWinResult({
          wins: d.wins,
          total_prize_ils: d.total_prize_ils,
        });
        if (!dryRun && d.credited > 0) {
          showToast(
            `זוכו ${d.credited} טבלאות — סה״כ ₪${d.total_prize_ils.toLocaleString()}`,
            "ok",
            5000,
          );
        }
      } catch (e) {
        alert("❌ " + extractApiError(e, "בדיקת זכיות נכשלה"));
      }
      return;
    }
    if (!legacyToken) {
      alert("בדיקת זכיות דורשת Legacy Admin Token (הגדר ב-sessionStorage: admin_token)");
      return;
    }
    const nums = winNums.split(/[\s,]+/).map(Number).filter((n) => n >= 1 && n <= 37);
    const strong = parseInt(winStrong);
    if (nums.length !== 6 || isNaN(strong) || strong < 1 || strong > 7) {
      alert("מספרים לא תקינים");
      return;
    }
    const r = await fetch("/api/admin/check-wins", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...legacyAdminHeader() },
      body: JSON.stringify({ draw_date: winDate, numbers: nums, strong }),
    });
    const d = await r.json();
    setWinResult(d);
  };

  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (t) setLegacyToken(t);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`toast toast-${toast.type === "err" ? "err" : "ok"}`}
        >
          {toast.msg}
        </div>
      )}
      <div className="admin-page-wrap">
        <main id="admin-main" className="admin-main">
          <h1 className="admin-page-title" style={{ marginBottom: 20 }}>
            דשבורד אדמין
          </h1>

          {stats && (
            <AdminStatGrid>
              {[
                {
                  label: "משתמשים",
                  value: String(stats.total_users),
                  sub: `+${stats.new_today} היום`,
                },
                { label: "מנויים פעילים", value: String(stats.active_subs) },
                {
                  label: "ממתינות להגשה",
                  value: String(stats.pending_orders),
                  accent: "#94a3b8",
                },
                { label: "הכנסות", value: `₪${stats.total_revenue?.toFixed(0)}` },
                { label: "זכיות", value: String(stats.total_wins) },
                { label: "פרסים", value: `₪${stats.total_prize?.toFixed(0)}` },
              ].map((s) => (
                <AdminStatCard
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  sub={s.sub}
                  accent={s.accent}
                />
              ))}
            </AdminStatGrid>
          )}

          {stats && stats.pending_orders > 0 && (
            <p style={{ fontSize: ".78rem", marginBottom: 16 }}>
              <Link href="/admin/orders" style={{ color: "var(--gold)" }}>
                {stats.pending_orders} הזמנות ממתינות — עבור לניהול הזמנות →
              </Link>
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
            <button
              onClick={() => loadData()}
              className="btn btn-outline"
              style={{ fontSize: ".72rem", marginRight: "auto" }}
              disabled={loading}
            >
              🔄 רענן סטטיסטיקות
            </button>
          </div>

          <div
            style={{
              background: "rgba(26,45,66,.85)",
              border: "1px solid var(--navy-b)",
              borderRadius: 14,
              padding: "20px 18px",
            }}
          >
            <h3
              style={{
                fontFamily: "'Frank Ruhl Libre',serif",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--cream)",
                marginBottom: 16,
              }}
            >
              תוצאות הגרלה וזכיות
            </h3>
            {canManageOrders && (
              <p style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 12 }}>
                צוות: טען מפיס → בדוק זכיות (מזכה יתרות בארנק הלקוחות אוטומטית).{" "}
                <Link href="/admin/orders" style={{ color: "var(--gold)" }}>
                  ניהול הזמנות ←
                </Link>
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 5 }}>
                  תאריך הגרלה:
                </div>
                <input
                  type="date"
                  value={winDate}
                  onChange={(e) => setWinDate(e.target.value)}
                  style={{
                    background: "var(--navy)",
                    border: "1px solid var(--navy-b)",
                    borderRadius: 8,
                    color: "var(--cream)",
                    padding: "8px 12px",
                    fontFamily: "Heebo,sans-serif",
                    fontSize: ".88rem",
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 5 }}>
                  6 מספרים (מופרדים בפסיקים):
                </div>
                <input
                  value={winNums}
                  onChange={(e) => setWinNums(e.target.value)}
                  placeholder="3, 7, 12, 25, 33, 36"
                  style={{
                    width: "100%",
                    background: "var(--navy)",
                    border: "1px solid var(--navy-b)",
                    borderRadius: 8,
                    color: "var(--cream)",
                    padding: "8px 12px",
                    fontFamily: "Heebo,sans-serif",
                    fontSize: ".88rem",
                    textAlign: "right",
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 5 }}>
                  מספר חזק (1–7):
                </div>
                <input
                  value={winStrong}
                  onChange={(e) => setWinStrong(e.target.value)}
                  placeholder="5"
                  maxLength={1}
                  style={{
                    width: 80,
                    background: "var(--navy)",
                    border: "1px solid var(--navy-b)",
                    borderRadius: 8,
                    color: "var(--cream)",
                    padding: "8px 12px",
                    fontFamily: "Heebo,sans-serif",
                    fontSize: ".88rem",
                    textAlign: "center",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                {canManageOrders ? (
                  <>
                    <button
                      className="btn btn-outline"
                      style={{ padding: "10px 20px" }}
                      onClick={() => checkWins(true)}
                    >
                      🔎 תצוגה מקדימה (ללא זיכוי)
                    </button>
                    <button
                      className="btn btn-gold"
                      style={{ padding: "10px 20px" }}
                      onClick={() => checkWins(false)}
                    >
                      💰 בדוק זכיות וזכה ארנקים
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-gold"
                    style={{ padding: "10px 20px" }}
                    onClick={() => checkWins(false)}
                  >
                    🔍 בדוק זכיות לקוחות
                  </button>
                )}
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--navy-b)", margin: "16px 0" }} />
              <h4 style={{ color: "var(--cream)", fontSize: ".88rem", marginBottom: 12 }}>
                💾 עדכן תוצאות הגרלה
              </h4>
              <p style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 12 }}>
                הזן ידנית מאתר{" "}
                <a
                  href="https://www.pais.co.il/lotto/"
                  target="_blank"
                  style={{ color: "var(--gold)" }}
                >
                  pais.co.il
                </a>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 4 }}>
                    תאריך הגרלה:
                  </div>
                  <input
                    type="date"
                    value={drawDate}
                    onChange={(e) => setDrawDate(e.target.value)}
                    style={{
                      background: "var(--navy)",
                      border: "1px solid var(--navy-b)",
                      borderRadius: 8,
                      color: "var(--cream)",
                      padding: "8px 12px",
                      fontFamily: "Heebo,sans-serif",
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 4 }}>
                    6 מספרים (מופרדים בפסיקים):
                  </div>
                  <input
                    value={drawNums2}
                    onChange={(e) => setDrawNums2(e.target.value)}
                    placeholder="10, 23, 25, 28, 32, 33"
                    style={{
                      width: "100%",
                      background: "var(--navy)",
                      border: "1px solid var(--navy-b)",
                      borderRadius: 8,
                      color: "var(--cream)",
                      padding: "8px 12px",
                      fontFamily: "Heebo,sans-serif",
                      textAlign: "right",
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 4 }}>
                    מספר חזק (1-7):
                  </div>
                  <input
                    value={drawStrong2}
                    onChange={(e) => setDrawStrong2(e.target.value)}
                    placeholder="4"
                    maxLength={1}
                    style={{
                      width: 80,
                      background: "var(--navy)",
                      border: "1px solid var(--navy-b)",
                      borderRadius: 8,
                      color: "var(--cream)",
                      padding: "8px 12px",
                      fontFamily: "Heebo,sans-serif",
                      textAlign: "center",
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 6 }}>
                    פרסים (₪):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                    {Object.entries(drawPrizes).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: ".6rem", color: "var(--muted)", marginBottom: 2 }}>
                          {k}
                        </div>
                        <input
                          type="number"
                          value={v}
                          onChange={(e) =>
                            setDrawPrizes((p) => ({ ...p, [k]: parseInt(e.target.value) || 0 }))
                          }
                          style={{
                            width: "100%",
                            background: "var(--navy)",
                            border: "1px solid var(--navy-b)",
                            borderRadius: 6,
                            color: "var(--cream)",
                            padding: "5px 6px",
                            fontFamily: "Heebo,sans-serif",
                            fontSize: ".76rem",
                            textAlign: "center",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    value={paisLotteryId}
                    onChange={(e) => setPaisLotteryId(e.target.value)}
                    placeholder="מס' הגרלה (ריק = אחרונה)"
                    style={{
                      width: 180,
                      background: "var(--navy)",
                      border: "1px solid var(--navy-b)",
                      borderRadius: 8,
                      color: "var(--cream)",
                      padding: "8px 12px",
                      fontFamily: "Heebo,sans-serif",
                      fontSize: ".78rem",
                    }}
                  />
                  <button className="btn btn-outline" onClick={fetchFromPais} disabled={paisLoading}>
                    {paisLoading ? "...טוען" : "🔄 טען מפאיס.co.il"}
                  </button>
                  <button className="btn btn-gold" style={{ padding: "10px 20px" }} onClick={saveDraw}>
                    💾 שמור תוצאות
                  </button>
                </div>
              </div>

              {winResult && (
                <div
                  style={{
                    background:
                      winResult.wins > 0 ? "rgba(29,185,106,.1)" : "rgba(26,45,66,.5)",
                    border: `1px solid ${winResult.wins > 0 ? "rgba(29,185,106,.35)" : "var(--navy-b)"}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    marginTop: 8,
                  }}
                >
                  {winResult.wins > 0 ? (
                    <>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--green)",
                          fontSize: ".92rem",
                          marginBottom: 4,
                        }}
                      >
                        🎉 נמצאו {winResult.wins} זכיות!
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: ".76rem" }}>
                        סה"כ פרסים: ₪{winResult.total_prize_ils.toLocaleString()}
                      </div>
                      {canManageOrders && (
                        <div style={{ color: "var(--muted)", fontSize: ".72rem", marginTop: 4 }}>
                          יתרות הארנק עודכנו בשרת
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>
                      אין זכיות בהגרלה זו
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
