"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/auth-context";

function ResetPasswordInner() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = params.get("token");
    if (!token) {
      setError("חסר אסימון");
      return;
    }
    try {
      const res = await authApi.resetPassword(token, password);
      setMessage(res.message);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full">
        <h1 className="mb-6 text-2xl font-bold">{t("resetTitle")}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={10}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <Button type="submit" className="w-full">
            שמור סיסמה
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  const tc = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">{tc("loading")}</div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
