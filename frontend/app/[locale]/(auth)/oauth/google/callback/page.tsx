"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { getAuthErrorMessage, useAuth } from "@/lib/auth/auth-context";

function GoogleOAuthCallbackInner() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeGoogleLogin } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    const ticket = searchParams.get("ticket");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (oauthError) {
      setError(oauthError);
      setLoading(false);
      return;
    }

    const payload =
      ticket
        ? { ticket }
        : code && state
          ? { code, state }
          : null;

    if (!payload) {
      setError(t("googleMissingTicket"));
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await completeGoogleLogin(payload);
        if (!cancelled) router.replace("/dashboard");
      } catch (err) {
        if (!cancelled) {
          setError(getAuthErrorMessage(err, tc("unexpectedError")));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completeGoogleLogin, router, searchParams, t, tc]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">{t("googleSigningIn")}</h1>
        {loading && !error ? <p className="text-sm text-[var(--muted-fg)]">{t("googlePleaseWait")}</p> : null}
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <Link
              href="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-fg)]"
            >
              {t("backToLogin")}
            </Link>
          </>
        ) : null}
      </Card>
    </div>
  );
}

export default function GoogleOAuthCallbackPage() {
  const tc = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">{tc("loading")}</div>
      }
    >
      <GoogleOAuthCallbackInner />
    </Suspense>
  );
}
