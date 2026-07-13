"use client";

import { useRef, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

function removeLightBackground(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 230 && g > 230 && b > 230) data[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

export function BackgroundRemoverTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const out = await removeLightBackground(file);
      setPreview(out);
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
          ? "Best for photos with a bright / white background. Processing stays on your device."
          : "עובד הכי טוב על תמונות עם רקע בהיר/לבן. העיבוד נשאר במכשיר שלכם."}
      </p>
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
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {preview ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="result" className="mx-auto max-h-80 rounded-xl border bg-[length:16px_16px] bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[position:0_0,8px_8px]" />
          <a href={preview} download="no-background.png" className="inline-flex rounded-full bg-[#6F42F5] px-4 py-2 text-sm font-bold text-white">
            {copy.download} PNG
          </a>
        </div>
      ) : null}
    </div>
  );
}
