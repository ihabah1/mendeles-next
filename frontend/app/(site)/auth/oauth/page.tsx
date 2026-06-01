"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Nav from "@/components/Nav";
import { tokenStore } from "@/lib/api/tokens";
import { useAuth } from "@/lib/auth/AuthContext";

/** Completes Google OAuth — reads JWT from URL hash and stores in localStorage. */
export default function OAuthCompletePage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access = params.get("access");
    const refresh = params.get("refresh");

    if (!access) {
      router.replace("/auth?error=google_token");
      return;
    }

    tokenStore.set(access, refresh || undefined);
    refreshUser()
      .catch(() => {})
      .finally(() => router.replace("/lotto"));
  }, [router, refreshUser]);

  return (
    <>
      <Nav />
      <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
        מתחבר עם Google...
      </div>
    </>
  );
}
