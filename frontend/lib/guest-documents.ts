import type { BusinessDocument } from "@/lib/api/documents";

const GUEST_DOCS_KEY = "mandeles-guest-documents";
const GUEST_LOGO_KEY = "mandeles-guest-logo";
const GUEST_NAME_KEY = "mandeles-guest-business-name";

export function loadGuestLogo(): string {
  try {
    return localStorage.getItem(GUEST_LOGO_KEY) || "";
  } catch {
    return "";
  }
}

export function saveGuestLogo(dataUrl: string) {
  try {
    if (dataUrl) localStorage.setItem(GUEST_LOGO_KEY, dataUrl);
    else localStorage.removeItem(GUEST_LOGO_KEY);
  } catch {
    /* ignore */
  }
}

export function loadGuestBusinessName(): string {
  try {
    return localStorage.getItem(GUEST_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function saveGuestBusinessName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(GUEST_NAME_KEY, name.trim());
    else localStorage.removeItem(GUEST_NAME_KEY);
  } catch {
    /* ignore */
  }
}

export function loadGuestDocuments(): BusinessDocument[] {
  try {
    const raw = localStorage.getItem(GUEST_DOCS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BusinessDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestDocument(doc: BusinessDocument) {
  try {
    const existing = loadGuestDocuments();
    const next = [{ ...doc, guest: true }, ...existing].slice(0, 20);
    localStorage.setItem(GUEST_DOCS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearGuestSession() {
  try {
    localStorage.removeItem(GUEST_DOCS_KEY);
    localStorage.removeItem(GUEST_LOGO_KEY);
    localStorage.removeItem(GUEST_NAME_KEY);
  } catch {
    /* ignore */
  }
}
