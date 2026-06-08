"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { lottoService, type LottoSetRow } from "@/lib/api/lotto";
import { extractApiError } from "@/lib/api/client";

export default function ProfileFormsPage() {
  const [sets, setSets] = useState<LottoSetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawFilter, setDrawFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await lottoService.mySets();
        setSets(res.sets);
      } catch (err) {
        setError(extractApiError(err, "שגיאה בטעינת הטפסים"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const drawDates = useMemo(() => {
    const dates = new Set<string>();
    sets.forEach((s) => {
      if (s.draw_date) dates.add(s.draw_date);
    });
    return Array.from(dates).sort().reverse();
  }, [sets]);

  const filtered = drawFilter
    ? sets.filter((s) => s.draw_date === drawFilter)
    : sets;

  return (
    <div>
      <h2 className="profile-panel-title">🎱 הטפסים שלי</h2>
      <p className="profile-panel-desc">כל הסטים והטבלאות שמילאת באתר</p>

      {drawDates.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <select
            className="input"
            value={drawFilter}
            onChange={(e) => setDrawFilter(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">כל ההגרלות</option>
            {drawDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <p className="profile-hint">טוען טפסים...</p>}
      {error && <div className="profile-alert error">{error}</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 12px" }}>
          <p className="profile-panel-desc">אין טפסים שמורים עדיין</p>
          <Link href="/lotto" className="btn btn-gold" style={{ marginTop: 12 }}>
            מלא טפסים עכשיו
          </Link>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="forms-list">
          {filtered.map((s) => (
            <div key={`${s.draw_date}-${s.set_index}`} className="forms-row">
              <span className="forms-row-nums" dir="ltr">
                #{s.set_index}{" "}
                {s.display ||
                  `${s.n1} ${s.n2} ${s.n3} ${s.n4} ${s.n5} ${s.n6} | ${s.strong}`}
              </span>
              {s.draw_date && <span className="forms-row-date">{s.draw_date}</span>}
            </div>
          ))}
        </div>
      )}

      <p className="profile-hint" style={{ marginTop: 12 }}>
        {filtered.length} טבלאות
        {drawFilter ? ` · הגרלה ${drawFilter}` : ""}
      </p>
    </div>
  );
}
