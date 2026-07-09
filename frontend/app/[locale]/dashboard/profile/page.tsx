"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

export default function ProfilePage() {
  const t = useTranslations("clientPortal");
  const tc = useTranslations("common");
  const { user, refreshSession } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
    preferred_locale: user?.preferred_locale || "he",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await authApi.updateMe(form);
      await refreshSession();
      setMessage(t("profileSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">{t("profileTitle")}</h1>
      <Card className="p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("email")}</span>
            <Input value={user?.email || ""} disabled />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("firstName")}</span>
            <Input
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("lastName")}</span>
            <Input
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("phone")}</span>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("language")}</span>
            <select
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              value={form.preferred_locale}
              onChange={(e) => setForm((f) => ({ ...f, preferred_locale: e.target.value }))}
            >
              <option value="he">{tc("hebrew")}</option>
              <option value="en">{tc("english")}</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? tc("loading") : tc("save")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
