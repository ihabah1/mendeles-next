import React from "react";

async function fetchHot() {
  const res = await fetch('/api/stats/hot', { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function HotNumbersPage() {
  const data = await fetchHot();
  const counts = data?.counts ?? [];
  const totalSets = data?.total_sets ?? 0;
  const top = counts.slice(0, 12);

  const maxCount = top.length ? top[0].count || 1 : 1;

  return (
    <main style={{ padding: 20 }}>
      <h1 className="page-head-title">Hot Numbers היסטוריים</h1>
      <p className="page-head-sub">תדירות הופעה של מספרים מבין כל הציונים שנשמרו בבסיס.</p>

      <section style={{ marginTop: 18, maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="home-section-title">פופולריים</h2>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>סך טבלאות: {totalSets}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          {top.length === 0 && <p style={{ color: 'var(--muted)' }}>לא נמצאו נתונים.</p>}

          {top.map((t: any) => (
            <div key={t.number} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 56, textAlign: 'center', fontWeight: 800, color: 'var(--gold)' }}>{t.number}</div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((t.count / Math.max(1, maxCount)) * 100)}%`, background: 'linear-gradient(90deg,var(--gold),#e6af00)', padding: '8px 10px', color: 'var(--navy)' }}>
                  {t.count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
