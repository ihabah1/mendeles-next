"use client";

import { contentPack, isRtlLocale } from "@/lib/i18n/locale-content";


import { useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

export function SpeedTestTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const [running, setRunning] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [mbps, setMbps] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    setPingMs(null);
    setMbps(null);
    try {
      const pingStart = performance.now();
      await fetch(`/api/health?_=${Date.now()}`, { cache: "no-store" });
      setPingMs(Math.round(performance.now() - pingStart));

      const size = 1_500_000;
      const url = `https://speed.cloudflare.com/__down?bytes=${size}&_=${Date.now()}`;
      const start = performance.now();
      const res = await fetch(url, { cache: "no-store", mode: "cors" });
      if (!res.ok) throw new Error("download failed");
      const buf = await res.arrayBuffer();
      const seconds = (performance.now() - start) / 1000;
      const bits = buf.byteLength * 8;
      setMbps(Math.round((bits / seconds / 1_000_000) * 10) / 10);
    } catch {
      setError(copy.error);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 text-center">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded-full bg-[#6F42F5] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {running ? copy.loading : contentPack(locale) !== "he" ? "Start test" : "התחל בדיקה"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Ping</p>
          <p className="mt-1 text-2xl font-extrabold">{pingMs != null ? `${pingMs} ms` : "—"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">{contentPack(locale) !== "he" ? "Download" : "הורדה"}</p>
          <p className="mt-1 text-2xl font-extrabold text-[#6F42F5]">{mbps != null ? `${mbps} Mbps` : "—"}</p>
        </div>
      </div>
    </div>
  );
}
