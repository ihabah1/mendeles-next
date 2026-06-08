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
const REG_PHONE_KEY = "reg_phone";

type Step = "loading" | "code" | "no-phone";

function VerifyPhoneForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/lotto";
  const { refreshUser } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const recaptchaReady = useRef(false);
  const autoSent = useRef(false);

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

  const checkFirebaseSetup = useCallback(async (): Promise<string[]> => {
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

    const cfg = await ensureFirebaseConfig();
    if (!cfg) {
      issues.push(
        "Firebase Frontend: בדוק NEXT_PUBLIC_FIREBASE_API_KEY ו-PROJECT_ID, ואז Redeploy",
      );
    }

    return issues;
  }, []);

  const sendOtpToPhone = useCallback(
    async (rawPhone: string) => {
      setPhone(rawPhone);
      setError("");
      setLoading(true);
      try {
        await ensureRecaptcha();
        const e164 = toE164(rawPhone);
        await sendPhoneOtp(e164);
        setStep("code");
        setResendIn(RESEND_SECONDS);
        setStatus(`קוד נשלח ל-${e164}`);
      } catch (err) {
        setError(formatFirebaseAuthError(err, extractApiError(err, "שליחת SMS נכשלה")));
        resetPhoneAuthSession();
        recaptchaReady.current = false;
        setStep("code");
      } finally {
        setLoading(false);
      }
    },
    [ensureRecaptcha],
  );

  useEffect(() => {
    if (!tokenStore.hasSession()) {
      router.replace(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (autoSent.current) return;
    autoSent.current = true;

    (async () => {
      const issues = await checkFirebaseSetup();
      if (issues.length > 0) {
        setError(issues.join("\n\n"));
        setStep("no-phone");
        return;
      }

      const me = await refreshUser();
      let savedPhone = me?.phone?.trim() || "";
      if (!savedPhone) {
        try {
          savedPhone = sessionStorage.getItem(REG_PHONE_KEY)?.trim() || "";
        } catch {
          /* ignore */
        }
      }

      if (!savedPhone) {
        setStep("no-phone");
        setError(
          "לא נמצא מספר טלפון בחשבון. חזור להרשמה והזן מספר בשלב הראשון — הוא ישמש לאימות SMS.",
        );
        return;
      }

      await sendOtpToPhone(savedPhone);
    })();
  }, [router, redirect, refreshUser, checkFirebaseSetup, sendOtpToPhone]);

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
      try {
        sessionStorage.removeItem(REG_PHONE_KEY);
      } catch {
        /* ignore */
      }
      setStatus(res.detail);
      setTimeout(() => router.push(redirect), 1200);
    } catch (err) {
      setError(extractApiError(err, "אימות הקוד נכשל"));
    } finally {
      setLoading(false);
    }
  };

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="input" style={props.style} />
  );

  const maskedPhone = phone ? toE164(phone) : "";

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
      <div className="card" style={{ padding: "28px 24px", width: "100%", maxWidth: 400 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.3rem",
            fontWeight: 900,
            color: "var(--text)",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          📱 אימות טלפון
        </h1>
        <p
          style={{
            fontSize: ".78rem",
            color: "var(--text2)",
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {step === "loading"
            ? "שולח קוד SMS למספר שהזנת בהרשמה..."
            : maskedPhone
              ? `הזן את קוד ה-SMS שנשלח ל-${maskedPhone}`
              : "הזן את קוד ה-SMS שנשלח לטלפון שלך"}
        </p>

        <div id="recaptcha-container" />

        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(232,0,30,.12)",
              border: "1px solid rgba(232,0,30,.45)",
              color: "#c01820",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: ".8rem",
              marginBottom: 14,
              textAlign: "center",
              whiteSpace: "pre-line",
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
          {step === "loading" && (
            <p style={{ textAlign: "center", color: "var(--text2)", fontSize: ".82rem" }}>
              {loading ? "שולח..." : "מכין אימות..."}
            </p>
          )}

          {step === "no-phone" && (
            <Link
              href="/auth"
              className="btn btn-gold"
              style={{ width: "100%", justifyContent: "center", padding: 12 }}
            >
              חזרה להרשמה
            </Link>
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
              {phone && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: "100%", justifyContent: "center", padding: 12 }}
                  onClick={() => sendOtpToPhone(phone)}
                  disabled={loading || resendIn > 0}
                >
                  {resendIn > 0 ? `שלח שוב (${resendIn}s)` : "שלח קוד שוב"}
                </button>
              )}
            </>
          )}

          <Link
            href="/auth"
            style={{
              color: "var(--text2)",
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
