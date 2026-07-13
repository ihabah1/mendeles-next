"use client";

import { useMemo, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

function amortize(principal: number, annualRate: number, years: number) {
  const n = years * 12;
  const r = annualRate / 100 / 12;
  const payment = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  const schedule: Array<{ month: number; payment: number; interest: number; principal: number; balance: number }> = [];
  let balance = principal;
  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    const principalPart = payment - interest;
    balance = Math.max(0, balance - principalPart);
    if (month <= 12 || month === n || month % 12 === 0) {
      schedule.push({
        month,
        payment,
        interest,
        principal: principalPart,
        balance,
      });
    }
  }
  return {
    payment,
    totalPaid: payment * n,
    totalInterest: payment * n - principal,
    schedule,
  };
}

export function MortgageTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const [principal, setPrincipal] = useState(1_500_000);
  const [rate, setRate] = useState(4.5);
  const [years, setYears] = useState(25);
  const result = useMemo(() => amortize(principal, rate, years), [principal, rate, years]);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        {locale === "en" ? "Loan amount (₪)" : "סכום הלוואה (₪)"}
        <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={principal} onChange={(e) => setPrincipal(Number(e.target.value) || 0)} />
      </label>
      <label className="block text-sm font-medium">
        {locale === "en" ? "Annual interest (%)" : "ריבית שנתית (%)"}
        <input type="number" step="0.1" className="mt-1 w-full rounded-xl border px-3 py-2" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} />
      </label>
      <label className="block text-sm font-medium">
        {locale === "en" ? "Years" : "שנים"}
        <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={years} onChange={(e) => setYears(Number(e.target.value) || 1)} />
      </label>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-500">{copy.result}</p>
        <p className="mt-2 text-2xl font-extrabold text-[#6F42F5]">
          {locale === "en" ? "Monthly" : "החזר חודשי"}: ₪{Math.round(result.payment).toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {locale === "en" ? "Total interest" : "סך ריבית"}: ₪{Math.round(result.totalInterest).toLocaleString()}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-start text-slate-500">
              <th className="py-2 pe-3">{locale === "en" ? "Month" : "חודש"}</th>
              <th className="py-2 pe-3">{locale === "en" ? "Payment" : "תשלום"}</th>
              <th className="py-2 pe-3">{locale === "en" ? "Interest" : "ריבית"}</th>
              <th className="py-2">{locale === "en" ? "Balance" : "יתרה"}</th>
            </tr>
          </thead>
          <tbody>
            {result.schedule.map((row) => (
              <tr key={row.month} className="border-b border-slate-100">
                <td className="py-2 pe-3">{row.month}</td>
                <td className="py-2 pe-3">₪{Math.round(row.payment).toLocaleString()}</td>
                <td className="py-2 pe-3">₪{Math.round(row.interest).toLocaleString()}</td>
                <td className="py-2">₪{Math.round(row.balance).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
