"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


import { useMemo, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

/** Approximate Israel 2025 monthly tax estimate (not official). */
function estimateNet(grossMonthly: number) {
  const annual = grossMonthly * 12;
  const brackets = [
    { upTo: 84120, rate: 0.1 },
    { upTo: 120720, rate: 0.14 },
    { upTo: 193800, rate: 0.2 },
    { upTo: 269280, rate: 0.31 },
    { upTo: 560280, rate: 0.35 },
    { upTo: 721560, rate: 0.47 },
    { upTo: Infinity, rate: 0.5 },
  ];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const slice = Math.max(0, Math.min(annual, b.upTo) - prev);
    tax += slice * b.rate;
    prev = b.upTo;
    if (annual <= b.upTo) break;
  }
  const creditPoints = 2.25 * 242 * 12;
  tax = Math.max(0, tax - creditPoints);

  let ni = 0;
  const niCeilingMonthly = 50695;
  const niBase = Math.min(grossMonthly, niCeilingMonthly);
  if (niBase <= 7522) ni = niBase * 0.0104;
  else ni = 7522 * 0.0104 + (niBase - 7522) * 0.07;

  let health = 0;
  if (niBase <= 7522) health = niBase * 0.0323;
  else health = 7522 * 0.0323 + (niBase - 7522) * 0.0503;

  const deductionsMonthly = tax / 12 + ni + health;
  const net = Math.max(0, grossMonthly - deductionsMonthly);
  return {
    net: Math.round(net),
    tax: Math.round(tax / 12),
    ni: Math.round(ni),
    health: Math.round(health),
    totalDeductions: Math.round(deductionsMonthly),
  };
}

export function NetSalaryTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const [mode, setMode] = useState<"gross" | "net">("gross");
  const [amount, setAmount] = useState(15000);
  const result = useMemo(() => {
    if (mode === "gross") return estimateNet(amount);
    let low = 0;
    let high = amount * 2.5;
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      const est = estimateNet(mid);
      if (est.net > amount) high = mid;
      else low = mid;
    }
    const gross = Math.round((low + high) / 2);
    return { ...estimateNet(gross), impliedGross: gross };
  }, [amount, mode]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("gross")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "gross" ? "bg-[#6F42F5] text-white" : "bg-slate-100"}`}
        >
          {contentPack(locale) !== "he" ? "Gross → Net" : "ברוטו → נטו"}
        </button>
        <button
          type="button"
          onClick={() => setMode("net")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "net" ? "bg-[#6F42F5] text-white" : "bg-slate-100"}`}
        >
          {contentPack(locale) !== "he" ? "Net → Gross" : "נטו → ברוטו"}
        </button>
      </div>
      <label className="block text-sm font-medium">
        {mode === "gross"
          ? contentPack(locale) !== "he"
            ? "Gross monthly salary (₪)"
            : "שכר ברוטו חודשי (₪)"
          : contentPack(locale) !== "he"
            ? "Desired net monthly (₪)"
            : "שכר נטו רצוי (₪)"}
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-500">{copy.result}</p>
        {"impliedGross" in result && result.impliedGross != null ? (
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {contentPack(locale) !== "he" ? "Est. gross" : "ברוטו משוער"}: ₪{result.impliedGross.toLocaleString()}
          </p>
        ) : null}
        <p className="mt-1 text-2xl font-extrabold text-[#6F42F5]">
          {contentPack(locale) !== "he" ? "Net" : "נטו"}: ₪{result.net.toLocaleString()}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          <li>
            {contentPack(locale) !== "he" ? "Income tax" : "מס הכנסה"}: ₪{result.tax.toLocaleString()}
          </li>
          <li>
            {contentPack(locale) !== "he" ? "National Insurance" : "ביטוח לאומי"}: ₪{result.ni.toLocaleString()}
          </li>
          <li>
            {contentPack(locale) !== "he" ? "Health tax" : "מס בריאות"}: ₪{result.health.toLocaleString()}
          </li>
        </ul>
      </div>
    </div>
  );
}
