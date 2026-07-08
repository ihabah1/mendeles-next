"use client";

import { useRouter, Link } from "@/lib/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/auth-context";

const FIELDS = [
  { key: "tenant_name", type: "text", autoComplete: "organization" },
  { key: "first_name", type: "text", autoComplete: "given-name" },
  { key: "last_name", type: "text", autoComplete: "family-name" },
  { key: "email", type: "email", autoComplete: "email" },
  { key: "password", type: "password", autoComplete: "new-password" },
] as const;

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
  const [resendLoading, setResendLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [emailFailed, setEmailFailed] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await authApi.register(form);
      setMessage(res.message);
      setRegisteredEmail(form.email);
      const failed = res.verification_email_sent === false;
      setEmailFailed(failed);
      if (!failed) {
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, tc("unexpectedError")));
    } finally {
      setLoading(false);
    }
  }

  const labels: Record<(typeof FIELDS)[number]["key"], string> = {
    tenant_name: t("tenantName"),
    first_name: t("firstName"),
    last_name: t("lastName"),
    email: t("email"),
    password: t("password"),
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full">
        <h1 className="mb-2 text-2xl font-bold">{t("register")}</h1>
        <p className="mb-6 text-sm text-slate-500">{t("registerHint")}</p>
        <form onSubmit={onSubmit} className="space-y-4">
          {FIELDS.map(({ key, type, autoComplete }) => (
            <div key={key}>
              <label htmlFor={`register-${key}`} className="mb-1 block text-sm">
                {labels[key]}
              </label>
              <Input
                id={`register-${key}`}
                type={type}
                autoComplete={autoComplete}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required
                minLength={key === "password" ? 10 : undefined}
              />
              {key === "password" && (
                <p className="mt-1 text-xs text-slate-500">{t("passwordHint")}</p>
              )}
            </div>
          ))}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          {message && <p className="text-sm text-green-700" role="status">{message}</p>}
          {emailFailed && registeredEmail && (
            <Button
              type="button"
              variant="ghost"
              disabled={resendLoading}
              className="w-full"
              onClick={async () => {
                setResendLoading(true);
                setError("");
                try {
                  const res = await authApi.resendVerification(registeredEmail);
                  setMessage(res.message);
                  if (res.verification_email_sent !== false) setEmailFailed(false);
                } catch (err) {
                  setError(getAuthErrorMessage(err, tc("unexpectedError")));
                } finally {
                  setResendLoading(false);
                }
              }}
            >
              {resendLoading ? tc("loading") : t("resendVerification")}
            </Button>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? tc("loading") : t("register")}
          </Button>
        </form>
        <p className="mt-4 text-sm">
          <Link href="/login">{t("hasAccount")}</Link>
        </p>
      </Card>
    </div>
  );
}
