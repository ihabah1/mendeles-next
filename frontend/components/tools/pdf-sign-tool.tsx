"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";
import { useEffect, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toolsCopy } from "@/lib/tools/copy";

type Position = "bottom-right" | "bottom-left" | "bottom-center";

export function PdfSignTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const he = contentPack(locale) === "he";
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const [fileName, setFileName] = useState("");
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [typedName, setTypedName] = useState("");
  const [position, setPosition] = useState<Position>("bottom-right");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [previewUrl, downloadUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 480;
    canvas.height = 160;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasStroke(true);
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError(he ? "נא לבחור קובץ PDF." : "Please choose a PDF file.");
      return;
    }
    setError("");
    setFileName(file.name);
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const buf = new Uint8Array(await file.arrayBuffer());
    setBytes(buf);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
    });
    try {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const count = doc.getPageCount();
      setPageCount(count);
      setPage(1);
    } catch {
      setPageCount(0);
      setError(copy.error);
    }
  }

  async function applySignature() {
    if (!bytes) {
      setError(he ? "העלו קובץ PDF קודם." : "Upload a PDF first.");
      return;
    }
    if (!hasStroke && !typedName.trim()) {
      setError(he ? "ציירו חתימה או הזינו שם." : "Draw a signature or type a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = doc.getPages();
      const idx = Math.min(Math.max(page, 1), pages.length) - 1;
      const target = pages[idx];
      const { width, height } = target.getSize();

      const margin = 36;
      const sigW = 160;
      const sigH = 54;
      let x = width - margin - sigW;
      if (position === "bottom-left") x = margin;
      if (position === "bottom-center") x = (width - sigW) / 2;
      const y = margin;

      if (hasStroke && canvasRef.current) {
        const png = canvasRef.current.toDataURL("image/png");
        const pngBytes = await fetch(png).then((r) => r.arrayBuffer());
        const image = await doc.embedPng(pngBytes);
        target.drawImage(image, { x, y, width: sigW, height: sigH });
      } else if (typedName.trim()) {
        const font = await doc.embedFont(StandardFonts.HelveticaOblique);
        target.drawText(typedName.trim().slice(0, 48), {
          x,
          y: y + 18,
          size: 18,
          font,
          color: rgb(0.08, 0.12, 0.2),
        });
      }

      const dateFont = await doc.embedFont(StandardFonts.Helvetica);
      const stamp = new Date().toLocaleDateString(he ? "he-IL" : "en-GB");
      target.drawText(stamp, {
        x,
        y: y - 2,
        size: 9,
        font: dateFont,
        color: rgb(0.4, 0.45, 0.55),
      });

      const out = await doc.save();
      const data = new Uint8Array(out);
      const blob = new Blob([data], { type: "application/pdf" });
      setDownloadUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setBytes(data);
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {he
          ? "העלו PDF, ציירו חתימה או הקלידו שם, בחרו מיקום — והורידו קובץ חתום. הכול נשאר במכשיר."
          : contentPack(locale) === "ar"
            ? "ارفع PDF، ارسم توقيعاً أو اكتب اسماً، اختر الموضع ثم نزّل الملف. يبقى كل شيء على جهازك."
            : "Upload a PDF, draw a signature or type a name, pick a position, and download. Everything stays on your device."}
      </p>

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => {
          void onFile(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => pdfInputRef.current?.click()}
        className="inline-flex rounded-full bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white"
      >
        {copy.choosePdf}
      </button>
      {fileName ? (
        <p className="text-sm font-medium text-slate-700">
          {fileName}
          {pageCount ? ` · ${pageCount} ${he ? "עמודים" : "pages"}` : ""}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-800">
          {he ? "עמוד לחתימה" : "Page to sign"}
          <input
            type="number"
            min={1}
            max={Math.max(pageCount, 1)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={page}
            onChange={(e) => setPage(Number(e.target.value) || 1)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {he ? "מיקום" : "Position"}
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
          >
            <option value="bottom-right">{he ? "למטה מימין" : "Bottom right"}</option>
            <option value="bottom-left">{he ? "למטה משמאל" : "Bottom left"}</option>
            <option value="bottom-center">{he ? "למטה במרכז" : "Bottom center"}</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-800">
        {he ? "שם לחתימה (אופציונלי)" : "Typed name (optional)"}
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={he ? "ישראל ישראלי" : "Your name"}
          dir={isRtlLocale(locale) ? "rtl" : "ltr"}
        />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">{he ? "ציירו חתימה" : "Draw signature"}</p>
          <button type="button" onClick={clearSignature} className="text-xs font-semibold text-[#6F42F5] underline">
            {he ? "נקה" : "Clear"}
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-2xl border border-slate-300 bg-white"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      <button
        type="button"
        disabled={busy || !bytes}
        onClick={() => void applySignature()}
        className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? copy.loading : he ? "החל חתימה" : "Apply signature"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {downloadUrl ? (
        <a
          href={downloadUrl}
          download={(fileName || "document").replace(/\.pdf$/i, "") + "-signed.pdf"}
          className="inline-flex rounded-full bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white"
        >
          {copy.download} PDF
        </a>
      ) : null}

      {previewUrl ? (
        <iframe title={fileName || "PDF"} src={previewUrl} className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-slate-50" />
      ) : null}
    </div>
  );
}
