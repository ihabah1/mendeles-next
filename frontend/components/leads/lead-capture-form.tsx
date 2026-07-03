"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicLeadsApi, readUtmFromLocation, type LeadCaptureFields } from "@/lib/api/public-leads";
import { trackEvent } from "@/lib/analytics/gtag";

type Props = {
  formId: string;
  pageId?: string;
  pageUrl?: string;
  className?: string;
};

export function LeadCaptureForm({ formId, pageId, pageUrl, className }: Props) {
  const t = useTranslations("leads.capture");
  const [fields, setFields] = useState<LeadCaptureFields>({ name: "", email: "", phone: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const utm = readUtmFromLocation(typeof window !== "undefined" ? window.location.search : "");
      await publicLeadsApi.submit({
        formId,
        pageId,
        pageUrl: pageUrl || (typeof window !== "undefined" ? window.location.href : ""),
        referrer: typeof document !== "undefined" ? document.referrer : "",
        fields,
        utm,
        honeypot,
      });
      trackEvent("generate_lead", {
        form_id: formId,
        page_id: pageId ?? "",
        page_url: pageUrl || (typeof window !== "undefined" ? window.location.pathname : ""),
      });
      setStatus("success");
      setFields({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  if (status === "success") {
    return (
      <div className={className} role="status">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">{t("success")}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => setStatus("idle")}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form className={className} onSubmit={onSubmit} noValidate>
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="lead-honeypot">{t("honeypot")}</label>
        <input
          id="lead-honeypot"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="lead-name" className="mb-1 block text-sm font-medium">
            {t("name")} <span aria-hidden="true">*</span>
          </label>
          <Input
            id="lead-name"
            name="name"
            required
            autoComplete="name"
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium">
            {t("phone")}
          </label>
          <Input
            id="lead-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={fields.phone || ""}
            onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="lead-email" className="mb-1 block text-sm font-medium">
            {t("email")} <span aria-hidden="true">*</span>
          </label>
          <Input
            id="lead-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={fields.email}
            onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="lead-message" className="mb-1 block text-sm font-medium">
            {t("message")}
          </label>
          <textarea
            id="lead-message"
            name="message"
            rows={4}
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={fields.message || ""}
            onChange={(e) => setFields((f) => ({ ...f, message: e.target.value }))}
          />
        </div>
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="mt-4" disabled={status === "loading"}>
        {status === "loading" ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
