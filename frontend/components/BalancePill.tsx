"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface BalancePillProps {
  balance: number;
  name?: string;
  compact?: boolean;
}

const GOLD = {
  bg: "#2a1e0a",
  border: "#4a3418",
  amt: "#c9a030",
  lbl: "#7a6030",
  cur: "#7a6030",
  ico: "#5a4020",
};
const PURPLE = {
  bg: "#2a1050",
  border: "#7f77dd",
  amt: "#afa9ec",
  lbl: "#9a94e0",
  cur: "#9a94e0",
  ico: "#afa9ec",
};

export default function BalancePill({ balance: initialBalance, name, compact }: BalancePillProps) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [displayBalance, setDisplayBalance] = useState(initialBalance);
  const [colors, setColors] = useState(GOLD);
  const [isPurple, setIsPurple] = useState(false);
  const [floatAmt, setFloatAmt] = useState("");
  const [floatVisible, setFloatVisible] = useState(false);
  const [floatY, setFloatY] = useState(8);
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);

  const applyColors = useCallback((c: typeof GOLD) => {
    setColors(c);
  }, []);

  const floatTag = useCallback((delta: number) => {
    setFloatAmt("+₪" + Math.abs(delta).toLocaleString());
    setFloatY(8);
    setFloatVisible(true);
    let start: number | null = null;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      const opacity = p < 0.15 ? p / 0.15 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      setFloatY(8 - p * 28);
      if (opacity <= 0.01) setFloatVisible(false);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const countUp = useCallback((from: number, to: number) => {
    let start: number | null = null;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayBalance(Math.round(from + (to - from) * ease));
      if (p < 1) requestAnimationFrame(step);
      else setDisplayBalance(to);
    }
    requestAnimationFrame(step);
  }, []);

  const startBlink = useCallback(
    (onDone: () => void) => {
      if (blinkRef.current) clearInterval(blinkRef.current);
      let i = 0;
      blinkRef.current = setInterval(() => {
        applyColors(i % 2 === 0 ? PURPLE : GOLD);
        i++;
        if (i >= 6) {
          if (blinkRef.current) clearInterval(blinkRef.current);
          applyColors(PURPLE);
          onDone();
        }
      }, 220);
    },
    [applyColors],
  );

  const triggerWin = useCallback(
    (delta: number, from: number) => {
      if (delta <= 0) return;
      const to = from + delta;
      setBalance(to);
      floatTag(delta);
      countUp(from, to);
      setIsPurple(false);
      startBlink(() => setIsPurple(true));
    },
    [countUp, floatTag, startBlink],
  );

  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  useEffect(() => {
    const prev = balanceRef.current;
    if (initialBalance > prev) {
      triggerWin(initialBalance - prev, prev);
    } else if (initialBalance !== prev) {
      setBalance(initialBalance);
      setDisplayBalance(initialBalance);
    }
  }, [initialBalance, triggerWin]);

  useEffect(() => {
    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function dismiss() {
    if (!isPurple) return;
    if (blinkRef.current) clearInterval(blinkRef.current);
    setIsPurple(false);
    applyColors(GOLD);
  }

  const amtSize = compact ? 18 : 24;
  const pad = compact ? "5px 10px" : "8px 16px";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 12 }}>
      {name && !compact && (
        <div style={{ fontSize: 12, color: "#7a6030" }}>
          שלום, <strong style={{ color: "#c9a030", fontSize: 13 }}>{name}</strong>
        </div>
      )}

      <div
        onClick={isPurple ? dismiss : () => router.push("/topup")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isPurple) dismiss();
            else router.push("/topup");
          }
        }}
        role="button"
        tabIndex={0}
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 8 : 14,
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 4,
          padding: pad,
          cursor: "pointer",
          position: "relative",
          transition: "background .15s, border-color .15s",
          userSelect: "none",
        }}
      >
        {floatVisible && (
          <div
            style={{
              position: "absolute",
              top: floatY,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 13,
              fontWeight: 700,
              color: "#afa9ec",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {floatAmt}
          </div>
        )}

        <div>
          <div
            style={{
              fontSize: compact ? 9 : 10,
              letterSpacing: ".8px",
              textTransform: "uppercase",
              color: colors.lbl,
            }}
          >
            יתרה
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <div
              style={{
                fontSize: amtSize,
                fontWeight: 700,
                letterSpacing: "-0.5px",
                lineHeight: 1,
                color: colors.amt,
                transition: "color .15s",
              }}
            >
              {displayBalance.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: compact ? 10 : 12,
                color: colors.cur,
                alignSelf: "flex-end",
                marginBottom: 2,
              }}
            >
              ₪
            </div>
          </div>
        </div>

        <svg
          width={compact ? 16 : 20}
          height={compact ? 16 : 20}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.ico}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "stroke .15s", flexShrink: 0 }}
          aria-hidden
        >
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          <path d="M16 3L20 7H4l4-4" />
          <circle cx="16" cy="14" r="1" fill={colors.ico} />
        </svg>
      </div>

      {!compact && (
        <button
          type="button"
          onClick={() => router.push("/topup")}
          style={{
            background: "#c9a030",
            color: "#1c1208",
            border: "none",
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + טען יתרה
        </button>
      )}
    </div>
  );
}
