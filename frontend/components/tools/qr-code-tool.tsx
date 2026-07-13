"use client";

import { useMemo, useState } from "react";
import { toolsCopy } from "@/lib/tools/copy";

type Kind = "url" | "wifi" | "phone" | "vcard";

export function QrCodeTool({ locale }: { locale: string }) {
  const copy = toolsCopy(locale);
  const [kind, setKind] = useState<Kind>("url");
  const [url, setUrl] = useState("https://mendeles.com");
  const [ssid, setSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const payload = useMemo(() => {
    if (kind === "url") return url;
    if (kind === "phone") return `tel:${phone}`;
    if (kind === "wifi") return `WIFI:T:WPA;S:${ssid};P:${wifiPass};;`;
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
  }, [kind, url, ssid, wifiPass, phone, name, email]);

  const src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payload)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["url", locale === "en" ? "URL" : "קישור"],
            ["wifi", "Wi‑Fi"],
            ["phone", locale === "en" ? "Phone" : "טלפון"],
            ["vcard", locale === "en" ? "vCard" : "כרטיס ביקור"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${kind === k ? "bg-[#6F42F5] text-white" : "bg-slate-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {kind === "url" ? (
        <input className="w-full rounded-xl border px-3 py-2" value={url} onChange={(e) => setUrl(e.target.value)} />
      ) : null}
      {kind === "wifi" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded-xl border px-3 py-2" placeholder="SSID" value={ssid} onChange={(e) => setSsid(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder="Password" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} />
        </div>
      ) : null}
      {kind === "phone" ? (
        <input className="w-full rounded-xl border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
      ) : null}
      {kind === "vcard" ? (
        <div className="grid gap-2">
          <input className="rounded-xl border px-3 py-2" placeholder={locale === "en" ? "Name" : "שם"} value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder={locale === "en" ? "Phone" : "טלפון"} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="QR" className="h-56 w-56 rounded-xl border bg-white p-2" />
        <a href={src} download="qr-code.png" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
          {copy.download}
        </a>
      </div>
    </div>
  );
}
