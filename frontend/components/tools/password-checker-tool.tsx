"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


import { useMemo, useState } from "react";

function charsetSize(password: string) {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/\d/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 33;
  return Math.max(size, 1);
}

function crackSeconds(password: string) {
  const guessesPerSecond = 1e10;
  const entropy = password.length * Math.log2(charsetSize(password));
  return Math.pow(2, entropy) / guessesPerSecond;
}

function formatDuration(seconds: number, locale: string) {
  if (!Number.isFinite(seconds) || seconds > 1e18) return contentPack(locale) !== "he" ? "centuries+" : "מאות שנים+";
  if (seconds < 1) return contentPack(locale) !== "he" ? "instantly" : "מיידית";
  if (seconds < 60) return `${Math.round(seconds)} ${contentPack(locale) !== "he" ? "sec" : "שנ׳"}`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} ${contentPack(locale) !== "he" ? "min" : "דק׳"}`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ${contentPack(locale) !== "he" ? "hours" : "שעות"}`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} ${contentPack(locale) !== "he" ? "days" : "ימים"}`;
  return `${Math.round(seconds / 31536000)} ${contentPack(locale) !== "he" ? "years" : "שנים"}`;
}

function scoreLabel(score: number, locale: string) {
  if (score < 2) return contentPack(locale) !== "he" ? "Very weak" : "חלשה מאוד";
  if (score < 3) return contentPack(locale) !== "he" ? "Weak" : "חלשה";
  if (score < 4) return contentPack(locale) !== "he" ? "Fair" : "בינונית";
  if (score < 5) return contentPack(locale) !== "he" ? "Strong" : "חזקה";
  return contentPack(locale) !== "he" ? "Very strong" : "חזקה מאוד";
}

export function PasswordCheckerTool({ locale }: { locale: string }) {
  const [password, setPassword] = useState("");
  const analysis = useMemo(() => {
    const length = password.length;
    let score = 0;
    if (length >= 8) score++;
    if (length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return {
      score,
      label: scoreLabel(score, locale),
      crack: formatDuration(crackSeconds(password || "a"), locale),
    };
  }, [password, locale]);

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {contentPack(locale) !== "he"
          ? "Your password stays in this browser and is never uploaded."
          : "הסיסמה נשארת בדפדפן בלבד ולא נשלחת לשרת."}
      </p>
      <label className="block text-sm font-medium">
        {contentPack(locale) !== "he" ? "Password" : "סיסמה"}
        <input
          type="text"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2 font-mono"
          placeholder={contentPack(locale) !== "he" ? "Type a password…" : "הקלידו סיסמה…"}
        />
      </label>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#6F42F5] transition-all"
          style={{ width: `${(analysis.score / 5) * 100}%` }}
        />
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
        <p className="text-lg font-bold text-slate-900">{analysis.label}</p>
        <p className="mt-2 text-slate-600">
          {contentPack(locale) !== "he" ? "Estimated crack time" : "זמן פריצה משוער"}: {analysis.crack}
        </p>
      </div>
    </div>
  );
}
