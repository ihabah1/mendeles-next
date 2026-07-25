"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Link, useRouter } from "@/lib/i18n/navigation";

function formatOAuthError(payload: unknown, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.error === "string" && obj.error) return obj.error;
    if (obj.error && typeof obj.error === "object") {
      const nested = obj.error as Record<string, unknown>;
      if (typeof nested.message === "string" && nested.message) return nested.message;
      if (typeof nested.exception_message === "string" && nested.exception_message) {
        return nested.exception_message;
      }
    }
    if (typeof obj.exception_message === "string" && obj.exception_message) {
      return obj.exception_message;
    }
    try {
      return JSON.stringify(payload);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function IntegrationsGoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const oauthError = searchParams.get("error");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (oauthError) {
      router.replace(`/dashboard/settings/integrations/google?oauth_error=${encodeURIComponent(oauthError)}`);
      return;
    }
    if (!code || !state) {
      setError("missing_code");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/integrations/google/oauth/callback/", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ code, state }),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok || data.ok !== true) {
          throw new Error(
            formatOAuthError(data.error ?? data, `OAuth complete failed (${res.status})`),
          );
        }
        if (!cancelled) {
          const serviceType =
            typeof data.service_type === "string" && data.service_type
              ? data.service_type
              : "analytics";
          router.replace(
            `/dashboard/settings/integrations/google?oauth_success=${encodeURIComponent(serviceType)}`,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : formatOAuthError(err, "OAuth failed"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">מחברים את Google…</h1>
        {!error ? <p className="text-sm text-[var(--muted-fg)]">רגע אחד, משלימים את האישור.</p> : null}
        {error ? (
          <>
            <p className="text-sm text-red-600 break-words">{error}</p>
            <Link
              href="/dashboard/settings/integrations/google"
              className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-fg)]"
            >
              חזרה לאינטגרציות
            </Link>
          </>
        ) : null}
      </Card>
    </div>
  );
}

export default function IntegrationsGoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted-fg)]">טוען…</div>
      }
    >
      <IntegrationsGoogleCallbackInner />
    </Suspense>
  );
}
