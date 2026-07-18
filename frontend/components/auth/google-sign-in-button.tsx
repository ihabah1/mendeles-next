"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { getAuthErrorMessage } from "@/lib/auth/auth-context";

type Props = {
  onError?: (message: string) => void;
};

export function GoogleSignInButton({ onError }: Props) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authApi
      .googleStatus()
      .then((res) => {
        if (!cancelled) setConfigured(Boolean(res.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (configured === false) return null;

  async function startGoogleLogin() {
    setLoading(true);
    try {
      const res = await authApi.googleStart();
      if (!res.auth_url) throw new Error(t("googleUnavailable"));
      window.location.assign(res.auth_url);
    } catch (err) {
      onError?.(getAuthErrorMessage(err, tc("unexpectedError")));
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading || configured === null}
      onClick={startGoogleLogin}
      className="flex w-full items-center justify-center gap-2 border-[var(--border)] bg-white text-slate-800 hover:bg-slate-50 dark:bg-transparent dark:text-[var(--foreground)] dark:hover:bg-[var(--muted)]"
    >
      <GoogleGlyph />
      {loading ? "…" : t("continueWithGoogle")}
    </Button>
  );
}

function GoogleGlyph() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.9 26.8 37 24 37c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.1 39.5 16 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.6 5.7-6.7 7.1l.1.1 6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
