"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


import { useEffect, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

const FREE_LIMIT = 5;
const STORAGE_KEY = "mendeles-ai-writer-uses";

type Kind = "headline" | "post" | "email" | "product";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readUses(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as { day: string; count: number }) : null;
    if (!data || data.day !== todayKey()) return 0;
    return data.count;
  } catch {
    return 0;
  }
}

function writeUses(count: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: todayKey(), count }));
}

function generate(kind: Kind, topic: string, locale: string) {
  const t = topic.trim() || (contentPack(locale) !== "he" ? "your offer" : "ההצעה שלכם");
  if (contentPack(locale) !== "he") {
    if (kind === "headline") return [`Discover ${t} that actually converts`, `Why ${t} is trending now`, `The smart way to grow with ${t}`];
    if (kind === "post")
      return [
        `Looking for better results with ${t}?\n\nHere's a simple tip: focus on one clear benefit, add social proof, and end with a clear CTA.\n\nReady to try ${t}?`,
      ];
    if (kind === "email")
      return [
        `Subject: Quick idea about ${t}\n\nHi,\n\nI noticed you might benefit from ${t}. In one sentence: it helps you get clearer results with less effort.\n\nWant a short walkthrough?\n\nBest regards`,
      ];
    return [`${t} — designed for busy teams\nClear benefits, simple setup, measurable impact.\nIdeal for professionals who want results without complexity.`];
  }
  if (kind === "headline") return [`גלו איך ${t} מייצר תוצאות`, `למה כולם מדברים על ${t}`, `${t}: הדרך החכמה לצמוח`];
  if (kind === "post")
    return [
      `מחפשים תוצאות טובות יותר עם ${t}?\n\nטיפ פשוט: התמקדו ביתרון אחד ברור, הוסיפו הוכחה חברתית, וסיימו בקריאה לפעולה.\n\nמוכנים לנסות את ${t}?`,
    ];
  if (kind === "email")
    return [
      `נושא: רעיון קצר לגבי ${t}\n\nשלום,\n\nחשבתי ש־${t} יכול להתאים לכם. במשפט אחד: זה עוזר להשיג תוצאות ברורות עם פחות מאמץ.\n\nנשמח להדגמה קצרה.\n\nבברכה`,
    ];
  return [`${t} — מותאם לצוותים עסוקים\nיתרונות ברורים, התקנה פשוטה, השפעה מדידה.\nמושלם למי שרוצה תוצאות בלי סיבוכים.`];
}

export function AiWriterTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const [kind, setKind] = useState<Kind>("headline");
  const [topic, setTopic] = useState("");
  const [uses, setUses] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUses(readUses());
  }, []);

  function run() {
    if (uses >= FREE_LIMIT) return;
    const next = uses + 1;
    writeUses(next);
    setUses(next);
    setOutput(generate(kind, topic, locale));
  }

  async function copyText() {
    await navigator.clipboard.writeText(output.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">
        {contentPack(locale) !== "he"
          ? `Free uses today: ${Math.max(0, FREE_LIMIT - uses)} / ${FREE_LIMIT}`
          : `שימושים חינמיים היום: ${Math.max(0, FREE_LIMIT - uses)} / ${FREE_LIMIT}`}
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["headline", contentPack(locale) !== "he" ? "Headlines" : "כותרות"],
            ["post", contentPack(locale) !== "he" ? "Posts" : "פוסטים"],
            ["email", contentPack(locale) !== "he" ? "Emails" : "מיילים"],
            ["product", contentPack(locale) !== "he" ? "Product" : "תיאור מוצר"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${kind === k ? "bg-[#6F42F5] text-white" : "bg-slate-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        className="w-full rounded-xl border px-3 py-2"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={contentPack(locale) !== "he" ? "Topic / product / service" : "נושא / מוצר / שירות"}
      />
      <button
        type="button"
        onClick={run}
        disabled={uses >= FREE_LIMIT}
        className="rounded-full bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {contentPack(locale) !== "he" ? "Generate" : "צור טקסט"}
      </button>
      {output.length ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          {output.map((item) => (
            <pre key={item.slice(0, 24)} className="whitespace-pre-wrap font-sans text-sm text-slate-800">
              {item}
            </pre>
          ))}
          <button type="button" onClick={copyText} className="rounded-lg border px-3 py-1.5 text-sm font-semibold">
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      ) : null}
    </div>
  );
}
