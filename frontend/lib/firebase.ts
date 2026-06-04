/**
 * Firebase client (Phone Auth) — npm `firebase` modular SDK.
 * Config from Firebase Console → Project settings → Your apps → Web.
 */
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

function firebaseConfig(): FirebaseOptions {
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    ...(measurementId ? { measurementId } : {}),
  };
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

/** Lazy-init Firebase Auth (client-side only). */
export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is only available in the browser");
  }
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase לא מוגדר — הוסף NEXT_PUBLIC_FIREBASE_* ב-Railway Frontend");
  }
  if (!auth) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig());
    auth = getAuth(app);
    if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
      void import("firebase/analytics")
        .then(({ getAnalytics, isSupported }) =>
          isSupported().then((ok) => (ok ? getAnalytics(app!) : null)),
        )
        .catch(() => {});
    }
  }
  return auth;
}
