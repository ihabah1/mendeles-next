import { NextRequest, NextResponse } from "next/server";

// מנוע טוטו — מתחבר ל-API Football ומנתח משחקים
// Demo mode כשאין API key אמיתי

const DEMO_FIXTURES = [
  { id: 1, home: "מכבי חיפה", away: "הפועל באר שבע", league: "ליגת העל", date: new Date().toISOString().slice(0,10), p1: 32, px: 28, p2: 40, score_h: 1.4, score_a: 1.7, weather: "☀️", status: "upcoming" },
  { id: 2, home: "מכבי תל אביב", away: "בית\"ר ירושלים", league: "ליגת העל", date: new Date().toISOString().slice(0,10), p1: 45, px: 25, p2: 30, score_h: 1.8, score_a: 1.3, weather: "🌤️", status: "upcoming" },
  { id: 3, home: "הפועל תל אביב", away: "עירוני קריות", league: "ליגת העל", date: new Date().toISOString().slice(0,10), p1: 38, px: 27, p2: 35, score_h: 1.6, score_a: 1.5, weather: "⛅", status: "upcoming" },
  { id: 4, home: "אשדוד", away: "הפועל חיפה", league: "ליגת העל", date: new Date().toISOString().slice(0,10), p1: 42, px: 22, p2: 36, score_h: 1.7, score_a: 1.4, weather: "☀️", status: "upcoming" },
  { id: 5, home: "בני סכנין", away: "מ.ס. אשדוד", league: "ליגת העל", date: new Date().toISOString().slice(0,10), p1: 35, px: 32, p2: 33, score_h: 1.3, score_a: 1.4, weather: "🌧️", status: "upcoming" },
  { id: 6, home: "הפועל ירושלים", away: "עירוני נס ציונה", league: "ליגת העל", date: new Date().toISOString().slice(0,10), p1: 28, px: 30, p2: 42, score_h: 1.2, score_a: 1.8, weather: "☁️", status: "upcoming" },
];

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get("type") || "fixtures";
  const apiKey = process.env.API_FOOTBALL_KEY;
  const isDemo = !apiKey || apiKey === "DEMO";

  if (isDemo || type === "demo") {
    return NextResponse.json({ fixtures: DEMO_FIXTURES, demo: true, updated_at: new Date().toISOString() });
  }

  // Real API call
  try {
    const r = await fetch("https://v3.football.api-sports.io/fixtures?league=382&season=2025&next=10", {
      headers: { "x-apisports-key": apiKey! },
      next: { revalidate: 3600 }, // cache 1 hour
    });
    const d = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixtures = (d.response || []).map((f: any) => ({
      id: f.fixture.id,
      home: f.teams.home.name,
      away: f.teams.away.name,
      league: f.league.name,
      date: f.fixture.date?.slice(0, 10),
      status: f.fixture.status.short,
      p1: null, px: null, p2: null, // calculated by engine
    }));
    return NextResponse.json({ fixtures, demo: false, updated_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ fixtures: DEMO_FIXTURES, demo: true, error: String(e) });
  }
}
