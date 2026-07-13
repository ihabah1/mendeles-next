"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


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
        { label: contentPack(locale) !== "he" ? "Kilometers" : "קילומטרים", value: value },
        { label: contentPack(locale) !== "he" ? "Miles" : "מיילים", value: value * 0.621371 },
        { label: contentPack(locale) !== "he" ? "Meters" : "מטרים", value: value * 1000 },
      ];
    }
    if (mode === "weight") {
      return [
        { label: contentPack(locale) !== "he" ? "Kilograms" : "קילוגרמים", value },
        { label: contentPack(locale) !== "he" ? "Pounds" : "ליברות", value: value * 2.20462 },
        { label: contentPack(locale) !== "he" ? "Grams" : "גרמים", value: value * 1000 },
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
            ["length", contentPack(locale) !== "he" ? "Length" : "אורך"],
            ["weight", contentPack(locale) !== "he" ? "Weight" : "משקל"],
            ["currency", contentPack(locale) !== "he" ? "Currency" : "מטבע"],
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
          ? contentPack(locale) !== "he"
            ? "Kilometers"
            : "קילומטרים"
          : mode === "weight"
            ? contentPack(locale) !== "he"
              ? "Kilograms"
              : "קילוגרמים"
            : contentPack(locale) !== "he"
              ? "Amount in ILS"
              : "סכום בשקלים"}
        <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} />
      </label>
      {mode === "currency" ? (
        <p className="text-xs text-slate-500">
          {contentPack(locale) !== "he" ? "Approximate rates for estimation only." : "שערים משוערים להערכה בלבד."}
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
