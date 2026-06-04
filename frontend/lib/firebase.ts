/**
 * Firebase client (Phone Auth) — npm `firebase` modular SDK.
 * Config from build-time NEXT_PUBLIC_* or runtime /api/config/firebase (Railway Docker).
 */
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

function configFromBuildEnv(): FirebaseOptions | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return null;

  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
    ...(measurementId ? { measurementId } : {}),
  };
}

let cachedConfig: FirebaseOptions | null | undefined;
let configPromise: Promise<FirebaseOptions | null> | null = null;
let runtimeConfigured: boolean | null = null;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

async function fetchRuntimeConfig(): Promise<FirebaseOptions | null> {
  const res = await fetch("/api/config/firebase", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    configured?: boolean;
    config?: FirebaseOptions;
  };
  if (!data.configured || !data.config?.apiKey || !data.config?.projectId) {
    return null;
  }
  return data.config;
}

/** Load Firebase config (build env first, then runtime API). */
export async function ensureFirebaseConfig(): Promise<FirebaseOptions | null> {
  if (cachedConfig !== undefined) return cachedConfig;

  if (!configPromise) {
    configPromise = (async () => {
      const built = configFromBuildEnv();
      if (built) {
        cachedConfig = built;
        runtimeConfigured = true;
        return built;
      }
      if (typeof window === "undefined") {
        cachedConfig = null;
        runtimeConfigured = false;
        return null;
      }
      const runtime = await fetchRuntimeConfig();
      cachedConfig = runtime;
      runtimeConfigured = runtime !== null;
      return runtime;
    })();
  }

  return configPromise;
}

/** Sync check — accurate after ensureFirebaseConfig() or when build env is set. */
export function isFirebaseConfigured(): boolean {
  if (runtimeConfigured !== null) return runtimeConfigured;
  return configFromBuildEnv() !== null;
}

/** Lazy-init Firebase Auth (client-side only). */
export async function getFirebaseAuth(): Promise<Auth> {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is only available in the browser");
  }

  const config = await ensureFirebaseConfig();
  if (!config) {
    throw new Error(
      "Firebase לא מוגדר — הוסף NEXT_PUBLIC_FIREBASE_* ב-Railway Frontend ועשה Redeploy",
    );
  }

  if (!auth) {
    app = getApps().length ? getApps()[0]! : initializeApp(config);
    auth = getAuth(app);
    if (config.measurementId) {
      void import("firebase/analytics")
        .then(({ getAnalytics, isSupported }) =>
          isSupported().then((ok) => (ok ? getAnalytics(app!) : null)),
        )
        .catch(() => {});
    }
  }
  return auth;
}
