"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { toolsCopy } from "@/lib/tools/copy";

export function PdfEditorTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [deletePages, setDeletePages] = useState("");
  const [coverTitle, setCoverTitle] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [stampText, setStampText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [previewUrl, downloadUrl]);

  const he = contentPack(locale) === "he";

  async function onFile(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError(he ? "נא לבחור קובץ PDF." : locale === "ar" ? "يرجى اختيار ملف PDF." : "Please choose a PDF file.");
      return;
    }
    setError("");
    setFileName(file.name);
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const buf = await file.arrayBuffer();
    const data = new Uint8Array(buf);
    setBytes(data);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    });
    try {
      const doc = await PDFDocument.load(data, { ignoreEncryption: true });
      setPageCount(doc.getPageCount());
    } catch {
      setPageCount(0);
      setError(copy.error);
    }
  }

  const deleteHint = useMemo(
    () => (he ? "למשל: 1,3-4" : locale === "ar" ? "مثال: 1,3-4" : "e.g. 1,3-4"),
    [he, locale],
  );

  function parsePageRanges(raw: string, total: number): number[] {
    const out = new Set<number>();
    for (const part of raw.split(",")) {
      const p = part.trim();
      if (!p) continue;
      if (p.includes("-")) {
        const [a, b] = p.split("-").map((x) => Number(x.trim()));
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        const from = Math.min(a, b);
        const to = Math.max(a, b);
        for (let i = from; i <= to; i++) {
          if (i >= 1 && i <= total) out.add(i - 1);
        }
      } else {
        const n = Number(p);
        if (Number.isFinite(n) && n >= 1 && n <= total) out.add(n - 1);
      }
    }
    return [...out].sort((a, b) => b - a);
  }

  async function applyEdits() {
    if (!bytes) {
      setError(he ? "העלו קובץ PDF קודם." : "Upload a PDF first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);

      const toDelete = parsePageRanges(deletePages, doc.getPageCount());
      for (const idx of toDelete) {
        if (idx >= 0 && idx < doc.getPageCount()) doc.removePage(idx);
      }

      if (coverTitle.trim() || coverNote.trim()) {
        const page = doc.insertPage(0, [595.28, 841.89]);
        const { width, height } = page.getSize();
        page.drawRectangle({
          x: 0,
          y: height - 140,
          width,
          height: 140,
          color: rgb(0.435, 0.259, 0.961),
        });
        page.drawText((coverTitle.trim() || "Document").slice(0, 80), {
          x: 48,
          y: height - 80,
          size: 28,
          font: bold,
          color: rgb(1, 1, 1),
        });
        if (coverNote.trim()) {
          const lines = coverNote.trim().split(/\n+/).slice(0, 12);
          let y = height - 180;
          for (const line of lines) {
            page.drawText(line.slice(0, 90), {
              x: 48,
              y,
              size: 14,
              font,
              color: rgb(0.1, 0.12, 0.18),
            });
            y -= 22;
          }
        }
      }

      if (stampText.trim()) {
        const stamp = stampText.trim().slice(0, 40);
        for (const page of doc.getPages()) {
          const { width, height } = page.getSize();
          page.drawText(stamp, {
            x: width / 2 - 80,
            y: height / 2 - 20,
            size: 36,
            font: bold,
            color: rgb(0.75, 0.1, 0.1),
            opacity: 0.18,
            rotate: degrees(-30),
          });
        }
      }

      const out = await doc.save();
      const data = new Uint8Array(out);
      const blob = new Blob([data], { type: "application/pdf" });
      setDownloadUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setPageCount(doc.getPageCount());
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
          ? "העלו PDF, הוסיפו עמוד שער, חותמת או מחקו עמודים — והורידו גרסה מעודכנת. הקובץ נשאר במכשיר שלכם."
          : locale === "ar"
            ? "ارفع PDF وأضف غلافاً أو ختماً أو احذف صفحات ثم نزّل النسخة. يبقى الملف على جهازك."
            : "Upload a PDF, add a cover page or watermark, delete pages, and download the result. The file stays on your device."}
      </p>

      <input
        ref={inputRef}
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
        onClick={() => inputRef.current?.click()}
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

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-800">
          {he ? "כותרת עמוד שער" : locale === "ar" ? "عنوان الغلاف" : "Cover title"}
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={coverTitle}
            onChange={(e) => setCoverTitle(e.target.value)}
            placeholder={he ? "למשל: הצעת מחיר" : "e.g. Proposal"}
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          {he ? "מחיקת עמודים" : locale === "ar" ? "حذف الصفحات" : "Delete pages"}
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm"
            value={deletePages}
            onChange={(e) => setDeletePages(e.target.value)}
            placeholder={deleteHint}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-800">
        {he ? "הערות על עמוד השער" : locale === "ar" ? "ملاحظات الغلاف" : "Cover notes"}
        <textarea
          className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          dir={isRtlLocale(locale) ? "rtl" : "ltr"}
        />
      </label>

      <label className="block text-sm font-medium text-slate-800">
        {he ? "חותמת על כל העמודים (אופציונלי)" : "Stamp / watermark (optional)"}
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={stampText}
          onChange={(e) => setStampText(e.target.value)}
          placeholder={he ? "למשל: טיוטה" : "e.g. DRAFT"}
        />
      </label>

      <button
        type="button"
        disabled={busy || !bytes}
        onClick={() => void applyEdits()}
        className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? copy.loading : he ? "החל עריכות" : locale === "ar" ? "تطبيق التعديلات" : "Apply edits"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {downloadUrl ? (
        <a
          href={downloadUrl}
          download={(fileName || "edited").replace(/\.pdf$/i, "") + "-edited.pdf"}
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
