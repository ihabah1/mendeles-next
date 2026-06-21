"use client";

import { useEffect, useState } from "react";

interface NextDraw {
  at: string;
  label: string;
  weekdayHe: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatParts(ms: number) {
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, done: false };
}

export default function DrawCountdown() {
  const [nextDraw, setNextDraw] = useState<NextDraw | null>(null);
  const [parts, setParts] = useState(formatParts(0));

  useEffect(() => {
    fetch("/django-api/lotto/draw/")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.next_draw?.at) setNextDraw(d.next_draw);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!nextDraw?.at) return;
    const tick = () => {
      const target = new Date(nextDraw.at).getTime();
      setParts(formatParts(target - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextDraw?.at]);

  if (!nextDraw) return null;

  const cells = [
    { label: "ימים", value: parts.days },
    { label: "שעות", value: parts.hours },
    { label: "דקות", value: parts.minutes },
    { label: "שניות", value: parts.seconds },
  ];

  return (
    <section className="draw-countdown" aria-live="polite">
      <div className="draw-countdown-inner">
        <div className="draw-countdown-head">
          <span className="draw-countdown-icon" aria-hidden>
            ⏱️
          </span>
          <div>
            <div className="draw-countdown-title">ספירה לאחור להגרלה הבאה</div>
            <div className="draw-countdown-sub">
              {nextDraw.weekdayHe ? `${nextDraw.weekdayHe} · ` : ""}
              {nextDraw.label}
            </div>
          </div>
        </div>
        <div className="draw-countdown-grid">
          {cells.map((c) => (
            <div key={c.label} className="draw-countdown-cell">
              <span className="draw-countdown-num">{pad(c.value)}</span>
              <span className="draw-countdown-lbl">{c.label}</span>
            </div>
          ))}
        </div>
        {parts.done && (
          <p className="draw-countdown-live">הגרלה קרובה — בהצלחה!</p>
        )}
      </div>
    </section>
  );
}
