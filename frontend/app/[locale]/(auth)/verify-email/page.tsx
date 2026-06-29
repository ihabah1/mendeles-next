"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
