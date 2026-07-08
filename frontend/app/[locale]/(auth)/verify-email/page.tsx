"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { authApi } from "@/lib/api/auth";
import { Card } from "@/components/ui/card";
import { getAuthErrorMessage } from "@/lib/auth/auth-context";

function VerifyEmailInner() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage(t("missingVerifyToken"));
      return;
    }
    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus("ok");
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getAuthErrorMessage(err, tc("unexpectedError")));
      });
  }, [params, t, tc]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full">
        <h1 className="mb-4 text-2xl font-bold">{t("verifyTitle")}</h1>
        <p className={status === "error" ? "text-red-600" : ""}>
          {message || (status === "loading" ? tc("loading") : "")}
        </p>
        {status === "ok" && (
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] text-sm font-medium text-[var(--primary-fg)] hover:opacity-90"
          >
            {t("goToLogin")}
          </Link>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  const tc = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">{tc("loading")}</div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
