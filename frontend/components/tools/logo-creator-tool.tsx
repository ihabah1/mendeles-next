"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

const STYLES = ["minimal", "badge", "orbit", "mono"] as const;
type StyleId = (typeof STYLES)[number];

const PALETTES = [
  { id: "violet", bg: "#4C1D95", fg: "#FFFFFF", accent: "#C4B5FD" },
  { id: "ink", bg: "#0F172A", fg: "#F8FAFC", accent: "#38BDF8" },
  { id: "sand", bg: "#F8F1E7", fg: "#1C1917", accent: "#B45309" },
  { id: "forest", bg: "#14532D", fg: "#ECFDF5", accent: "#86EFAC" },
  { id: "rose", bg: "#881337", fg: "#FFF1F2", accent: "#FDA4AF" },
] as const;

function drawLogo(
  ctx: CanvasRenderingContext2D,
  size: number,
  opts: { name: string; tagline: string; style: StyleId; bg: string; fg: string; accent: string },
) {
  const { name, tagline, style, bg, fg, accent } = opts;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bg;
  if (style === "badge") {
    const r = size * 0.12;
    roundRect(ctx, size * 0.06, size * 0.06, size * 0.88, size * 0.88, r);
    ctx.fill();
  } else if (style === "orbit") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = size * 0.018;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 1.5);
    ctx.stroke();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  const initial = (name.trim()[0] || "M").toUpperCase();
  if (style === "mono") {
    ctx.fillStyle = accent;
    ctx.fillRect(size * 0.12, size * 0.12, size * 0.18, size * 0.18);
  } else {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(size * 0.22, size * 0.22, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(size * 0.28)}px Arial, Helvetica, sans-serif`;
  ctx.fillText(initial, size / 2, size * 0.42);

  ctx.font = `bold ${Math.round(size * 0.085)}px Arial, Helvetica, sans-serif`;
  ctx.fillText((name || "Brand").slice(0, 22), size / 2, size * 0.68);

  if (tagline.trim()) {
    ctx.globalAlpha = 0.85;
    ctx.font = `${Math.round(size * 0.045)}px Arial, Helvetica, sans-serif`;
    ctx.fillText(tagline.slice(0, 36), size / 2, size * 0.78);
    ctx.globalAlpha = 1;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function LogoCreatorTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("Mendeles");
  const [tagline, setTagline] = useState(locale === "en" ? "Grow with AI" : "צמיחה עם AI");
  const [style, setStyle] = useState<StyleId>("minimal");
  const [paletteId, setPaletteId] = useState<(typeof PALETTES)[number]["id"]>("violet");
  const [pngUrl, setPngUrl] = useState<string | null>(null);

  const palette = useMemo(() => PALETTES.find((p) => p.id === paletteId) || PALETTES[0], [paletteId]);
  const he = locale !== "en" && locale !== "ar";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 640;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawLogo(ctx, size, {
      name,
      tagline,
      style,
      bg: palette.bg,
      fg: palette.fg,
      accent: palette.accent,
    });
    setPngUrl(canvas.toDataURL("image/png"));
  }, [name, tagline, style, palette]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {he
          ? "צרו לוגו פשוט לשיתופים, מצגות ומסמכים — והורידו PNG מיד. הכול רץ בדפדפן."
          : locale === "ar"
            ? "أنشئ شعاراً بسيطاً للمنشورات والعروض ثم نزّل PNG. كل شيء يعمل في المتصفح."
            : "Create a simple logo for posts and decks, then download a PNG. Everything runs in your browser."}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-800">
          {he ? "שם המותג" : locale === "ar" ? "اسم العلامة" : "Brand name"}
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {he ? "סלוגן" : locale === "ar" ? "شعار نصي" : "Tagline"}
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-800">{he ? "סגנון" : "Style"}</p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${
                style === s ? "bg-[#6F42F5] text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-800">{he ? "פלטת צבעים" : "Palette"}</p>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaletteId(p.id)}
              className={`h-10 w-10 rounded-full border-2 ${paletteId === p.id ? "border-slate-900" : "border-transparent"}`}
              style={{ background: `linear-gradient(135deg, ${p.bg}, ${p.accent})` }}
              aria-label={p.id}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <canvas ref={canvasRef} className="h-56 w-56 rounded-2xl shadow-sm" />
        {pngUrl ? (
          <a
            href={pngUrl}
            download={`${(name || "logo").replace(/\s+/g, "-").toLowerCase()}-logo.png`}
            className="inline-flex rounded-full bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white"
          >
            {copy.download} PNG
          </a>
        ) : null}
      </div>
    </div>
  );
}
