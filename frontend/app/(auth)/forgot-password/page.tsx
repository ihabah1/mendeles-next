"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/auth-context";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await authApi.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <Card className="w-full">
        <h1 className="mb-6 text-2xl font-bold">{t("forgotPassword")}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm">{message}</p>}
          <Button type="submit" className="w-full">
            שלח קישור
          </Button>
        </form>
        <p className="mt-4 text-sm">
          <Link href="/login">חזרה להתחברות</Link>
        </p>
      </Card>
    </div>
  );
}
