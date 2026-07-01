import { DEFAULT_A11Y_PREFERENCES, type AccessibilityPreferences } from "./types";

const STORAGE_KEY = "mendeles-a11y";

export function loadPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULT_A11Y_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_PREFERENCES;
    return { ...DEFAULT_A11Y_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_A11Y_PREFERENCES;
  }
}

export function savePreferences(prefs: AccessibilityPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function applyPreferencesToDocument(prefs: AccessibilityPreferences): void {
  const root = document.documentElement;
  root.style.setProperty("--a11y-font-scale", String(prefs.fontScale));
  root.dataset.a11yFontScale = String(prefs.fontScale);
  root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  root.classList.toggle("a11y-highlight-links", prefs.highlightLinks);
  root.classList.toggle("a11y-readable-font", prefs.readableFont);
  root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);
  root.classList.toggle("a11y-underline-links", prefs.underlineLinks);
}

/** Inline script to apply saved prefs before React hydration (prevents flash). */
export const EARLY_A11Y_SCRIPT = `(function(){try{var r=localStorage.getItem("${STORAGE_KEY}");if(!r)return;var p=JSON.parse(r),d=document.documentElement;if(p.fontScale)d.style.setProperty("--a11y-font-scale",String(p.fontScale));if(p.highContrast)d.classList.add("a11y-high-contrast");if(p.highlightLinks)d.classList.add("a11y-highlight-links");if(p.readableFont)d.classList.add("a11y-readable-font");if(p.reduceMotion)d.classList.add("a11y-reduce-motion");if(p.underlineLinks)d.classList.add("a11y-underline-links");}catch(e){}})();`;
