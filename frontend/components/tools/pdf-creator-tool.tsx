"use client";

import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { toolsCopy } from "@/lib/tools/copy";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function buildPdf(opts: {
  locale: string;
  nature: string;
  body: string;
  logoDataUrl: string | null;
}): Promise<string> {
  const rtl = opts.locale !== "en";
  const scale = 2;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const logo = opts.logoDataUrl ? await loadImage(opts.logoDataUrl) : null;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("canvas");
  measure.font = "16px Arial, Helvetica, sans-serif";
  const bodyLines = wrapLines(measure, opts.body.trim() || " ", CONTENT_W);
  const lineHeight = 24;
  const natureHeight = opts.nature.trim() ? 36 : 0;
  let logoDrawH = 0;
  let logoDrawW = 0;
  if (logo) {
    const maxLogoH = 72;
    const maxLogoW = 180;
    const ratio = Math.min(maxLogoW / logo.width, maxLogoH / logo.height, 1);
    logoDrawW = logo.width * ratio;
    logoDrawH = logo.height * ratio;
  }

  type PageBlock = { kind: "logo" } | { kind: "nature" } | { kind: "line"; text: string };
  const blocks: PageBlock[] = [];
  if (logo) blocks.push({ kind: "logo" });
  if (opts.nature.trim()) blocks.push({ kind: "nature" });
  for (const line of bodyLines) blocks.push({ kind: "line", text: line });

  const pages: PageBlock[][] = [];
  let current: PageBlock[] = [];
  let y = MARGIN;

  function pushPage() {
    if (current.length) pages.push(current);
    current = [];
    y = MARGIN;
  }

  for (const block of blocks) {
    const h =
      block.kind === "logo" ? logoDrawH + 20 : block.kind === "nature" ? natureHeight + 8 : lineHeight;
    if (y + h > PAGE_H - MARGIN && current.length) pushPage();
    current.push(block);
    y += h;
  }
  pushPage();
  if (!pages.length) pages.push([]);

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    if (pageIndex > 0) pdf.addPage();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(PAGE_W * scale);
    canvas.height = Math.round(PAGE_H * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.fillStyle = "#0f172a";

    let cursorY = MARGIN;
    const textX = rtl ? PAGE_W - MARGIN : MARGIN;

    for (const block of pages[pageIndex]) {
      if (block.kind === "logo" && logo) {
        const logoX = rtl ? PAGE_W - MARGIN - logoDrawW : MARGIN;
        ctx.drawImage(logo, logoX, cursorY, logoDrawW, logoDrawH);
        cursorY += logoDrawH + 20;
      } else if (block.kind === "nature") {
        ctx.font = "bold 22px Arial, Helvetica, sans-serif";
        ctx.fillText(opts.nature.trim(), textX, cursorY + 22);
        cursorY += natureHeight + 8;
        ctx.strokeStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(MARGIN, cursorY - 4);
        ctx.lineTo(PAGE_W - MARGIN, cursorY - 4);
        ctx.stroke();
      } else if (block.kind === "line") {
        ctx.font = "16px Arial, Helvetica, sans-serif";
        ctx.fillText(block.text, textX, cursorY + 16);
        cursorY += lineHeight;
      }
    }

    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, PAGE_W, PAGE_H);
  }

  return pdf.output("datauristring");
}

/** Local cleanup: spacing, punctuation, and light formatting — no server. */
function fixDocumentText(raw: string, locale: string): string {
  let text = raw.replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");

  // Spaces around punctuation
  text = text.replace(/\s+([,.;:!?…])/g, "$1");
  text = text.replace(/([,.;:!?…])(?=[^\s\n])/g, "$1 ");
  text = text.replace(/([(„"«])\s+/g, "$1");
  text = text.replace(/\s+([)»"”])/g, "$1");

  // Hebrew / English quotes normalization
  text = text.replace(/"{2,}/g, '"');
  text = text.replace(/'{2,}/g, "'");

  // Duplicate punctuation
  text = text.replace(/([.!?…]){2,}/g, "$1");
  text = text.replace(/,{2,}/g, ",");

  // Dashes
  text = text.replace(/\s*[–—]\s*/g, " — ");
  text = text.replace(/(\S)-(\S)/g, "$1-$2");

  if (locale === "en") {
    text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix: string, ch: string) => prefix + ch.toUpperCase());
  }

  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function emphasizeHeading(raw: string): { nature: string; body: string } {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const firstIdx = lines.findIndex((l) => l.trim());
  if (firstIdx < 0) return { nature: "", body: "" };
  const heading = lines[firstIdx].trim().replace(/^#+\s*/, "");
  const rest = [...lines.slice(0, firstIdx), ...lines.slice(firstIdx + 1)].join("\n").trim();
  return { nature: heading.slice(0, 120), body: rest };
}

function formatParagraphs(raw: string): string {
  let text = fixDocumentText(raw, "he");
  // Break dense blocks into paragraphs at sentence ends when there are no blank lines.
  if (!/\n\s*\n/.test(text)) {
    text = text.replace(/([.!?…])\s+(?=\S)/g, "$1\n\n");
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function numberSections(raw: string): string {
  const parts = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return raw.trim();
  return parts
    .map((p, i) => {
      const cleaned = p.replace(/^\d+[\.\-\):\s]+/, "").trim();
      return `${i + 1}. ${cleaned}`;
    })
    .join("\n\n");
}

export function PdfCreatorTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [nature, setNature] = useState("");
  const [body, setBody] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fixedNote, setFixedNote] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);

  function onLogo(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(typeof reader.result === "string" ? reader.result : null);
      setLogoName(file.name);
      setPdfUrl(null);
    };
    reader.readAsDataURL(file);
  }

  function markUpdated() {
    setPdfUrl(null);
    setError("");
    setFixedNote(true);
    setDesignOpen(false);
    window.setTimeout(() => setFixedNote(false), 2000);
  }

  function applyDesign(action: "heading" | "fix" | "paragraphs" | "number") {
    if (!body.trim() && action !== "heading") {
      setError(locale === "en" ? "Add text to design first." : "הוסיפו קודם טקסט לעיצוב.");
      return;
    }
    if (action === "heading") {
      const next = emphasizeHeading(body || nature);
      if (next.nature) setNature(next.nature);
      setBody(next.body);
      markUpdated();
      return;
    }
    if (action === "fix") {
      setBody(fixDocumentText(body, locale));
      markUpdated();
      return;
    }
    if (action === "paragraphs") {
      setBody(formatParagraphs(body));
      markUpdated();
      return;
    }
    setBody(numberSections(body));
    markUpdated();
  }

  async function create() {
    if (!body.trim() && !logoDataUrl && !nature.trim()) {
      setError(locale === "en" ? "Add text, a logo, or a document type." : "הוסיפו טקסט, לוגו או אופי מסמך.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const out = await buildPdf({ locale, nature, body, logoDataUrl });
      setPdfUrl(out);
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {locale === "en"
          ? "Build a simple document with an optional logo and download a PDF instantly. Everything stays on your device."
          : "הכינו מסמך פשוט עם לוגו אופציונלי והורידו PDF מיד. הכול נשאר במכשיר שלכם."}
      </p>

      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          onLogo(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
        >
          {copy.uploadLogo}
        </button>
        {logoName ? <span className="text-sm text-slate-600">{logoName}</span> : null}
        {logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUrl} alt="" className="h-12 w-auto rounded-lg border bg-white object-contain p-1" />
        ) : null}
      </div>

      <label className="block text-sm font-medium text-slate-800">
        {copy.documentNature}
        <span className="ms-2 font-normal text-slate-500">({locale === "en" ? "optional" : "אופציונלי"})</span>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={nature}
          onChange={(e) => {
            setNature(e.target.value);
            setPdfUrl(null);
          }}
          placeholder={copy.documentNatureHint}
        />
      </label>

      <label className="block text-sm font-medium text-slate-800">
        {copy.documentText}
        <textarea
          className="mt-1 min-h-40 w-full rounded-xl border px-3 py-2 leading-relaxed"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setPdfUrl(null);
            setFixedNote(false);
          }}
          placeholder={locale === "en" ? "Write your document text here…" : "כתבו כאן את טקסט המסמך…"}
          dir={locale === "en" ? "ltr" : "rtl"}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            type="button"
            disabled={!body.trim()}
            onClick={() => setDesignOpen((v) => !v)}
            className="inline-flex rounded-full border border-[#6F42F5] bg-white px-5 py-2.5 text-sm font-bold text-[#6F42F5] disabled:opacity-50"
          >
            {copy.designText}
          </button>
          {designOpen ? (
            <div className="absolute z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              {(
                [
                  ["heading", copy.designHeading],
                  ["fix", copy.fixText],
                  ["paragraphs", copy.designParagraphs],
                  ["number", copy.designNumberSections],
                ] as const
              ).map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-start text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => applyDesign(action)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void create()}
          className="inline-flex rounded-full bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? copy.loading : copy.createPdf}
        </button>
        {fixedNote ? (
          <span className="text-sm font-medium text-emerald-700">
            {locale === "en" ? "Text updated." : "הטקסט עודכן."}
          </span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {pdfUrl ? (
        <div className="space-y-3">
          <a
            href={pdfUrl}
            download="document.pdf"
            className="inline-flex rounded-full bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white"
          >
            {copy.download} PDF
          </a>
          <iframe title="PDF preview" src={pdfUrl} className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-slate-50" />
        </div>
      ) : null}
    </div>
  );
}
