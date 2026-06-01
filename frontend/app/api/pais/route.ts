import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import { join } from "path";
import axios from "axios";
import https from "https";

const client = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
    "Accept-Language": "he-IL,he;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
    "Referer": "https://www.pais.co.il/lotto/",
  },
});

async function scrapePais(lotteryId?: number) {
  // מצא הגרלה אחרונה
  if (!lotteryId) {
    const { data: archiveHtml } = await client.get("https://www.pais.co.il/lotto/archive.aspx");
    const ids = [...archiveHtml.matchAll(/lotteryId=(\d+)/g)].map((m: RegExpMatchArray) => parseInt(m[1]));
    lotteryId = ids.length > 0 ? Math.max(...ids) : 3930;
  }

  const { data: html } = await client.get(
    `https://www.pais.co.il/Lotto/CurrentLotto.aspx?lotteryId=${lotteryId}`
  );

  // תאריך
  const dateMatch = html.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : new Date().toISOString().slice(0,10);

  // 6 מספרים
  const numsSection = html.match(/aria-label="המספרים שעלו בגורל"([\s\S]{0,3000}?)<\/ol>/);
  const numbers = numsSection
    ? [...numsSection[1].matchAll(/class="loto_info_num">\s*<div[^>]*>(\d{1,2})<\/div>/g)].map((m: RegExpMatchArray) => parseInt(m[1]))
    : [];

  // חזק
  const strongMatch = html.match(/aria-label="המספר החזק (\d{1,2})"/);
  const strong = strongMatch ? parseInt(strongMatch[1]) : 0;

  // פרסים
  const prizesSection = html.match(/id="regularLottoList"([\s\S]{0,10000}?)<\/ol>/);
  const winners = prizesSection
    ? [...prizesSection[1].matchAll(/aria-label="מספר זוכים ([\d,]+)"/g)].map((m: RegExpMatchArray) => parseInt(m[1].replace(/,/g,"")))
    : [];
  const amounts = prizesSection
    ? [...prizesSection[1].matchAll(/aria-label="סכום זכייה ([\d,]+)\s*₪"/g)].map((m: RegExpMatchArray) => parseInt(m[1].replace(/,/g,"")))
    : [];

  if (numbers.length !== 6) throw new Error(`Expected 6 numbers, got ${numbers.length}`);
  if (!strong) throw new Error("Could not find strong number");

  const rankKeys = ["6+strong","6","5+strong","5","4+strong","4","3+strong","3"];
  const rankNames = ["6 + חזק","6","5 + חזק","5","4 + חזק","4","3 + חזק","3"];
  const prizes: Record<string, { name: string; winners: number; ils: number }> = {};
  rankKeys.forEach((key, i) => {
    prizes[key] = { name: rankNames[i], winners: winners[i] ?? 0, ils: amounts[i] ?? 0 };
  });

  console.log(`[PAIS] Draw ${lotteryId}: ${numbers.join(",")} +${strong} | prizes: ${winners.length}`);
  return { lottery_id: lotteryId, date, numbers, strong, prizes };
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  try {
    const data = await scrapePais(id ? parseInt(id) : undefined);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[PAIS ERROR]", e);
    return NextResponse.json({ error: String(e), detail: e instanceof Error ? e.message : JSON.stringify(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const data = await scrapePais(body.lottery_id ? parseInt(body.lottery_id) : undefined);

    const drawResults = {
      last_draw: { date: data.date, numbers: data.numbers, strong: data.strong, lottery_id: data.lottery_id },
      prizes: Object.fromEntries(
        Object.entries(data.prizes).map(([k, v]) => [k, { name: v.name, ils: v.ils }])
      ),
      updated_at: new Date().toISOString(),
    };

    writeFileSync(join(process.cwd(), "draw_results.json"), JSON.stringify(drawResults, null, 2), "utf-8");
    return NextResponse.json({ status: "ok", data: drawResults });
  } catch (e) {
    console.error("[PAIS ERROR]", String(e));
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
