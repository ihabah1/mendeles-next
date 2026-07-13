"use client";

import { useEffect, useRef, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

export function PdfViewerTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  function onFile(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError(locale === "en" ? "Please choose a PDF file." : "נא לבחור קובץ PDF.");
      return;
    }
    setError("");
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {locale === "en"
          ? "Open a PDF and view it here. The file never leaves your device."
          : "פתחו קובץ PDF וצפו בו כאן. הקובץ לא יוצא מהמכשיר שלכם."}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0] || null);
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
      {fileName ? <p className="text-sm font-medium text-slate-700">{fileName}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {url ? (
        <iframe
          title={fileName || "PDF"}
          src={url}
          className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-slate-50"
        />
      ) : null}
    </div>
  );
}
