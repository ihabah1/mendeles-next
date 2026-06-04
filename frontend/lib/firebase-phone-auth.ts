/**
 * Firebase Phone Auth helpers (reCAPTCHA + OTP).
 */
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmation: ConfirmationResult | null = null;

export function resetPhoneAuthSession(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    recaptchaVerifier = null;
  }
  confirmation = null;
}

export async function initRecaptcha(containerId: string): Promise<RecaptchaVerifier> {
  resetPhoneAuthSession();
  const auth = await getFirebaseAuth();
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {},
  });
  return recaptchaVerifier;
}

export async function sendPhoneOtp(phoneE164: string): Promise<void> {
  if (!recaptchaVerifier) {
    throw new Error("reCAPTCHA לא אותחל");
  }
  const auth = await getFirebaseAuth();
  confirmation = await signInWithPhoneNumber(auth, phoneE164, recaptchaVerifier);
}

export async function confirmPhoneOtp(code: string): Promise<string> {
  if (!confirmation) {
    throw new Error("יש לשלוח קוד SMS לפני האימות");
  }
  const cred = await confirmation.confirm(code);
  return cred.user.getIdToken();
}

/** Map Firebase Auth errors to actionable Hebrew messages. */
export function formatFirebaseAuthError(err: unknown, fallback: string): string {
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: string }).code === "string"
      ? (err as { code: string }).code
      : "";
  const message =
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: string }).message === "string"
      ? (err as { message: string }).message
      : String(err ?? "");

  if (
    code === "auth/operation-not-allowed" ||
    message.includes("region enabled")
  ) {
    return (
      "Firebase חוסם SMS לישראל. ב-Firebase Console → Authentication → Settings → " +
      "SMS region policy → Allow → הוסף Israel (IL). ודא שתוכנית Blaze פעילה ו-Phone מופעל."
    );
  }
  if (code === "auth/invalid-phone-number") {
    return "מספר טלפון לא תקין — הזן מספר ישראלי (05X...)";
  }
  if (code === "auth/too-many-requests") {
    return "יותר מדי ניסיונות — נסה שוב מאוחר יותר";
  }
  if (code === "auth/captcha-check-failed") {
    return "reCAPTCHA נכשל — רענן את הדף ונסה שוב";
  }
  return message || fallback;
}

/** Israeli local → E.164 (+972...) */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) throw new Error("מספר טלפון לא תקין");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 9) return `+972${digits.slice(1)}`;
  if (digits.length >= 9) return `+${digits}`;
  throw new Error("מספר טלפון לא תקין");
}
