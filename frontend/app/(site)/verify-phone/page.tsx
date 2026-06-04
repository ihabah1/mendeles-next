"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { authService } from "@/lib/api/auth";
import { extractApiError } from "@/lib/api/client";
import { resolveApiBaseUrl } from "@/lib/api/config";
import { tokenStore } from "@/lib/api/tokens";
import { ensureFirebaseConfig } from "@/lib/firebase";
import {
  confirmPhoneOtp,
  initRecaptcha,
  resetPhoneAuthSession,
  formatFirebaseAuthError,
  sendPhoneOtp,
  toE164,
} from "@/lib/firebase-phone-auth";
import { useAuth } from "@/lib/auth/AuthContext";

const RESEND_SECONDS = 60;

function VerifyPhoneForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/lotto";
  const { refreshUser } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const recaptchaReady = useRef(false);

  useEffect(() => {
    if (!tokenStore.hasSession()) {
      router.replace(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    const checkFirebaseSetup = async () => {
      const issues: string[] = [];

      try {
        const feRes = await fetch("/api/config/firebase", { cache: "no-store" });
        const fe = feRes.ok
          ? ((await feRes.json()) as { configured?: boolean; hint?: string })
          : null;
        if (!fe?.configured) {
          issues.push(
            fe?.hint ||
              "Frontend (mendeles-next): הוסף NEXT_PUBLIC_FIREBASE_* ב-Railway ו-Redeploy",
          );
        }
      } catch {
        issues.push("Frontend: לא ניתן לבדוק /api/config/firebase");
      }

      try {
        const base = await resolveApiBaseUrl();
        const beRes = await fetch(`${base}/auth/phone-verification-status/`, {
          cache: "no-store",
        });
        const be = beRes.ok
          ? ((await beRes.json()) as {
              firebase_ready?: boolean;
              hint?: string;
              firebase_backend?: { hint?: string; project_id?: string };
            })
          : null;
        if (!be?.firebase_ready) {
          issues.push(
            be?.hint ||
              be?.firebase_backend?.hint ||
              "Backend (eloquent-perfection): FIREBASE_SERVICE_ACCOUNT_JSON + PHONE_VERIFICATION_ENABLED=true",
          );
        }
      } catch {
        issues.push("Backend: לא ניתן להתחבר ל-phone-verification-status");
      }

      if (issues.length > 0) {
        setError(issues.join("\n\n"));
        return;
      }

      const cfg = await ensureFirebaseConfig();
      if (!cfg) {
        setError(
          "Firebase Frontend: בדוק NEXT_PUBLIC_FIREBASE_API_KEY ו-PROJECT_ID, ואז Redeploy",
        );
      }
    };

    void checkFirebaseSetup();
  }, [router, redirect]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    return () => resetPhoneAuthSession();
  }, []);

  const ensureRecaptcha = useCallback(async () => {
    if (!recaptchaReady.current) {
      await initRecaptcha("recaptcha-container");
      recaptchaReady.current = true;
    }
  }, []);

  const handleSendOtp = async () => {
    setError("");
    setStatus("");
    setLoading(true);
    try {
      await ensureRecaptcha();
      const e164 = toE164(phone);
      await sendPhoneOtp(e164);
      setStep("code");
      setResendIn(RESEND_SECONDS);
      setStatus(`קוד נשלח ל-${e164}`);
    } catch (err) {
      setError(formatFirebaseAuthError(err, extractApiError(err, "שליחת SMS נכשלה")));
      resetPhoneAuthSession();
      recaptchaReady.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.replace(/\D/g, "");
    if (code.length < 6) {
      setError("הזן קוד בן 6 ספרות");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const firebaseToken = await confirmPhoneOtp(code);
      const res = await authService.verifyFirebasePhone(firebaseToken);
      await refreshUser();
      setStatus(res.detail);
      setTimeout(() => router.push(redirect), 1200);
    } catch (err) {
      setError(extractApiError(err, "אימות הקוד נכשל"));
    } finally {
      setLoading(false);
    }
  };

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      style={{
        width: "100%",
        background: "var(--navy-c)",
        border: "1px solid var(--navy-b)",
        borderRadius: 8,
        color: "var(--cream)",
        fontFamily: "Heebo,sans-serif",
        fontSize: ".9rem",
        padding: "10px 12px",
        textAlign: "right",
        outline: "none",
        ...props.style,
      }}
    />
  );

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--navy-c)",
          border: "1px solid var(--navy-b)",
          borderRadius: 16,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <h1
          style={{
            fontFamily: "'Frank Ruhl Libre',serif",
            fontSize: "1.3rem",
            fontWeight: 900,
            color: "var(--cream)",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          📱 אימות טלפון
        </h1>
        <p
          style={{
            fontSize: ".78rem",
            color: "var(--muted)",
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          שלב אחרון: אימות SMS דרך Firebase
        </p>

        <div id="recaptcha-container" />

        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(232,0,30,.12)",
              border: "1px solid rgba(232,0,30,.45)",
              color: "#ff8a96",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: ".8rem",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
        {status && (
          <div
            style={{
              background: "rgba(29,185,106,.1)",
              border: "1px solid rgba(29,185,106,.3)",
              color: "var(--green)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: ".78rem",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            {status}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {step === "phone" && (
            <>
              {inp({
                placeholder: "טלפון (050-1234567)",
                type: "tel",
                value: phone,
                onChange: (e) => setPhone(e.target.value),
                disabled: loading,
              })}
              <button
                type="button"
                className="btn btn-gold"
                style={{ width: "100%", justifyContent: "center", padding: 12 }}
                onClick={handleSendOtp}
                disabled={loading || !phone.trim()}
              >
                {loading ? "שולח..." : "שלח קוד SMS"}
              </button>
            </>
          )}
          {step === "code" && (
            <>
              {inp({
                placeholder: "קוד 6 ספרות",
                inputMode: "numeric",
                maxLength: 6,
                value: otp,
                onChange: (e) => setOtp(e.target.value.replace(/\D/g, "")),
                disabled: loading,
                onKeyDown: (e) => e.key === "Enter" && handleVerifyOtp(),
              })}
              <button
                type="button"
                className="btn btn-gold"
                style={{ width: "100%", justifyContent: "center", padding: 12 }}
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
              >
                {loading ? "מאמת..." : "אימות קוד"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: "100%", justifyContent: "center", padding: 12 }}
                onClick={handleSendOtp}
                disabled={loading || resendIn > 0}
              >
                {resendIn > 0 ? `שלח שוב (${resendIn}s)` : "שלח קוד שוב"}
              </button>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: ".72rem",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  resetPhoneAuthSession();
                  recaptchaReady.current = false;
                }}
              >
                שנה מספר טלפון
              </button>
            </>
          )}
          <Link
            href="/auth"
            style={{
              color: "var(--muted)",
              fontSize: ".72rem",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            חזרה לכניסה
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <>
      <Nav />
      <Suspense
        fallback={
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            טוען...
          </div>
        }
      >
        <VerifyPhoneForm />
      </Suspense>
    </>
  );
}
