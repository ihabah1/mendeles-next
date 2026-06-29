"use client";

import { useRouter, Link } from "@/lib/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/auth-context";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    tenant_name: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.register(form);
      setMessage(res.message);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(getAuthErrorMessage(err, tc("unexpectedError")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full">
        <h1 className="mb-6 text-2xl font-bold">{t("register")}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          {(
            [
              ["tenant_name", t("tenantName")],
              ["first_name", t("firstName")],
              ["last_name", t("lastName")],
              ["email", t("email")],
              ["password", t("password")],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm">{label}</label>
              <Input
                type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required
                minLength={key === "password" ? 10 : undefined}
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "…" : t("register")}
          </Button>
        </form>
        <p className="mt-4 text-sm">
          <Link href="/login">{t("hasAccount")}</Link>
        </p>
      </Card>
    </div>
  );
}
