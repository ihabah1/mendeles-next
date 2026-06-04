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

/** Israeli local → E.164 (+972...) */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) throw new Error("מספר טלפון לא תקין");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 9) return `+972${digits.slice(1)}`;
  if (digits.length >= 9) return `+${digits}`;
  throw new Error("מספר טלפון לא תקין");
}
