"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


import { useRef, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

type Format = "image/png" | "image/jpeg" | "image/webp";

export function FileConverterTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<Format>("image/png");
  const [out, setOut] = useState<string | null>(null);
  const [name, setName] = useState("converted");
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      setName(file.name.replace(/\.[^.]+$/, ""));
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (target === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      setOut(canvas.toDataURL(target, 0.92));
    } finally {
      setBusy(false);
    }
  }

  const ext = target === "image/png" ? "png" : target === "image/webp" ? "webp" : "jpg";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {contentPack(locale) !== "he"
          ? "Convert JPG / PNG / WebP in the browser. PDF↔Word requires a dedicated converter service."
          : "המירו JPG / PNG / WebP בדפדפן. PDF↔Word דורש שירות המרה ייעודי."}
      </p>
      <label className="block text-sm font-medium">
        {contentPack(locale) !== "he" ? "Output format" : "פורמט יעד"}
        <select className="mt-1 w-full rounded-xl border px-3 py-2" value={target} onChange={(e) => setTarget(e.target.value as Format)}>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPG</option>
          <option value="image/webp">WebP</option>
        </select>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          void onFile(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex rounded-full bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? copy.loading : copy.chooseImage}
      </button>
      {out ? (
        <a href={out} download={`${name}.${ext}`} className="inline-flex rounded-full bg-[#6F42F5] px-4 py-2 text-sm font-bold text-white">
          {copy.download} .{ext}
        </a>
      ) : null}
    </div>
  );
}
