"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { authService } from "@/lib/api/auth";
import { extractApiError } from "@/lib/api/client";
import { tokenStore } from "@/lib/api/tokens";
import { useAuth } from "@/lib/auth/AuthContext";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const redirect = params.get("redirect") || "/lotto";
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const verified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("קישור האימות לא תקין.");
      return;
    }
    if (verified.current) return;
    verified.current = true;

    (async () => {
      tokenStore.clear();
      try {
        const res = await authService.verifyEmail(token);
        if (res.phone_verification_required) {
          if (res.access && res.refresh) {
            tokenStore.set(res.access, res.refresh);
          }
          setStatus("ok");
          setMessage(res.detail);
          setTimeout(
            () =>
              router.push(
                `/verify-phone?redirect=${encodeURIComponent(redirect)}`,
              ),
            1500,
          );
          return;
        }
        await refreshUser();
        setStatus("ok");
        setMessage(res.detail);
        setTimeout(() => router.push(redirect), 1500);
      } catch (err) {
        setStatus("error");
        const msg = extractApiError(err, "אימות האימייל נכשל");
        if (/user not found/i.test(msg)) {
          setMessage(
            "קישור האימות לא תקף (ייתכן שכבר נעשה שימוש בו). נסה «שלח שוב אימייל אימות» מהרשמה, או התחבר.",
          );
        } else if (/לא תקף|פג תוקפו/i.test(msg)) {
          setMessage(
            "קישור האימות פג תוקף או כבר שומש. הירשם שוב או שלח אימייל אימות מחדש.",
          );
        } else {
          setMessage(msg);
        }
      }
    })();
  }, [token, redirect, router, refreshUser]);

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        style={{
          background: "var(--navy-c)",
          border: "1px solid var(--navy-b)",
          borderRadius: 16,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        {status === "loading" && (
          <>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✉️</div>
            <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>מאמת את האימייל...</p>
          </>
        )}
        {status === "ok" && (
          <>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✅</div>
            <p style={{ color: "var(--green)", fontSize: ".88rem", marginBottom: 12 }}>{message}</p>
            <p style={{ color: "var(--muted)", fontSize: ".78rem" }}>מעביר אותך לאתר...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚠️</div>
            <p style={{ color: "#ff8a96", fontSize: ".85rem", marginBottom: 16, lineHeight: 1.5 }}>{message}</p>
            <Link href="/auth" className="btn btn-gold" style={{ display: "inline-flex", justifyContent: "center", padding: "10px 20px" }}>
              חזרה להרשמה / כניסה
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>טוען...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </>
  );
}
