import { resolveApiBaseUrl } from "./config";
import { tokenStore } from "./tokens";

const BLOB_TIMEOUT_MS = 120_000;

/** Download a protected API path as blob and open in a new tab (scans, PDFs). */
export async function openProtectedBlob(apiPath: string): Promise<void> {
  const base = await resolveApiBaseUrl();
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const token = tokenStore.getAccess();

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), BLOB_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `שגיאה ${res.status}`;
      try {
        const data = JSON.parse(text) as { detail?: string; error?: string };
        message = data.detail || data.error || message;
      } catch {
        if (text) message = text.slice(0, 200);
      }
      throw new Error(message);
    }

    const blob = await res.blob();
    if (!blob.size) {
      throw new Error("קובץ הסריקה ריק — העלה מחדש דרך scan_app");
    }

    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      URL.revokeObjectURL(url);
      throw new Error("הדפדפן חסם חלון חדש — אפשר pop-ups ונסה שוב");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "הורדת הסריקה לקחה יותר מדי זמן — נסה שוב או בדוק שה-backend פעיל",
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}
