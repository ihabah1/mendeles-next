"use client";

import { useMemo, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

const RATES = { ILS: 1, USD: 0.27, EUR: 0.25 };

type Mode = "length" | "weight" | "currency";

export function UnitConverterTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const [mode, setMode] = useState<Mode>("length");
  const [value, setValue] = useState(10);

  const rows = useMemo(() => {
    if (mode === "length") {
      return [
        { label: locale === "en" ? "Kilometers" : "קילומטרים", value: value },
        { label: locale === "en" ? "Miles" : "מיילים", value: value * 0.621371 },
        { label: locale === "en" ? "Meters" : "מטרים", value: value * 1000 },
      ];
    }
    if (mode === "weight") {
      return [
        { label: locale === "en" ? "Kilograms" : "קילוגרמים", value },
        { label: locale === "en" ? "Pounds" : "ליברות", value: value * 2.20462 },
        { label: locale === "en" ? "Grams" : "גרמים", value: value * 1000 },
      ];
    }
    return [
      { label: "ILS ₪", value: value },
      { label: "USD $", value: value * RATES.USD },
      { label: "EUR €", value: value * RATES.EUR },
    ];
  }, [mode, value, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["length", locale === "en" ? "Length" : "אורך"],
            ["weight", locale === "en" ? "Weight" : "משקל"],
            ["currency", locale === "en" ? "Currency" : "מטבע"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${mode === k ? "bg-[#6F42F5] text-white" : "bg-slate-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="block text-sm font-medium">
        {mode === "length"
          ? locale === "en"
            ? "Kilometers"
            : "קילומטרים"
          : mode === "weight"
            ? locale === "en"
              ? "Kilograms"
              : "קילוגרמים"
            : locale === "en"
              ? "Amount in ILS"
              : "סכום בשקלים"}
        <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} />
      </label>
      {mode === "currency" ? (
        <p className="text-xs text-slate-500">
          {locale === "en" ? "Approximate rates for estimation only." : "שערים משוערים להערכה בלבד."}
        </p>
      ) : null}
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-500">{copy.result}</p>
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between text-sm font-medium">
              <span>{row.label}</span>
              <span>{row.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
