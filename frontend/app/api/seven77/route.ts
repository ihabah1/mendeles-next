import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface Set777 { nums: number[]; score: number; }

function filterBySum(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  return sum >= 170 && sum <= 340;
}

function filterBySimilarity(nums: number[], pastResults: number[][]): boolean {
  const setNums = new Set(nums);
  for (const past of pastResults) {
    const intersection = past.filter((n) => setNums.has(n)).length;
    if (intersection >= 6) return false;
  }
  return true;
}

function calcGapScore(nums: number[], pastResults: number[][]): number {
  const gaps: number[] = [];
  for (const n of nums) {
    let gap = 0;
    for (let i = pastResults.length - 1; i >= 0; i--) {
      if (pastResults[i].includes(n)) break;
      gap++;
    }
    gaps.push(gap);
  }
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

function filterByGap(nums: number[], pastResults: number[][]): boolean {
  if (pastResults.length < 10) return true;
  const avgGap = calcGapScore(nums, pastResults);
  return avgGap >= 15;
}

function loadJson<T>(filename: string, fallback: T): T {
  try {
    const raw = readFileSync(join(process.cwd(), "data", filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const FALLBACK_SETS: number[][] = [
  [3, 11, 18, 27, 35, 51, 64],
  [7, 15, 22, 33, 42, 57, 68],
  [2, 14, 25, 38, 47, 55, 63],
];

export async function GET(req: NextRequest) {
  const isPremium = req.headers.get("x-premium") === "1";

  if (!isPremium) {
    return NextResponse.json({
      status: "demo",
      message: "בדיקה חינמית — הזן מספרים לבדיקה",
      sets: [],
    });
  }

  const readySets = loadJson<number[][]>("777_combos.json", FALLBACK_SETS);
  const history = loadJson<number[][]>("777_history.json", []);

  const filtered: Set777[] = [];
  for (const nums of readySets) {
    if (!filterBySum(nums)) continue;
    if (!filterBySimilarity(nums, history)) continue;
    if (!filterByGap(nums, history)) continue;
    const score = calcGapScore(nums, history);
    filtered.push({ nums, score });
  }

  filtered.sort((a, b) => b.score - a.score);
  const top3 = filtered.slice(0, 3).map((s) => s.nums);

  return NextResponse.json({
    status: "ok",
    sets: top3,
    total_checked: readySets.length,
    passed_filter: filtered.length,
  });
}

export async function POST(req: NextRequest) {
  const { nums } = await req.json();
  if (!nums || nums.length !== 7) {
    return NextResponse.json({ status: "error", message: "נדרשים 7 מספרים" }, { status: 400 });
  }

  const history = loadJson<number[][]>("777_history.json", []);

  const checks = [
    { name: "מסננת סכום", pass: filterBySum(nums) },
    { name: "מסננת זיכרון", pass: filterBySimilarity(nums, history) },
    { name: "מדד פיגור", pass: filterByGap(nums, history) },
  ];

  const allPass = checks.every((c) => c.pass);
  return NextResponse.json({
    status: allPass ? "approved" : "rejected",
    checks,
    message: allPass ? "✅ הצירוף עבר את שלושת הסינונים!" : "❌ הצירוף לא עבר סינון",
  });
}
