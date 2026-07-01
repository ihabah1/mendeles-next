"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyPreferencesToDocument, loadPreferences, savePreferences } from "./preferences";
import { DEFAULT_A11Y_PREFERENCES, FONT_SCALE_STEPS, type AccessibilityPreferences } from "./types";

type AccessibilityContextValue = {
  prefs: AccessibilityPreferences;
  announce: string;
  setFontScale: (scale: number) => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  toggle: (key: keyof Omit<AccessibilityPreferences, "fontScale">) => void;
  reset: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(DEFAULT_A11Y_PREFERENCES);
  const [announce, setAnnounce] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    applyPreferencesToDocument(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyPreferencesToDocument(prefs);
    savePreferences(prefs);
  }, [prefs, hydrated]);

  const notify = useCallback((message: string) => {
    setAnnounce("");
    requestAnimationFrame(() => setAnnounce(message));
  }, []);

  const update = useCallback(
    (patch: Partial<AccessibilityPreferences>, message?: string) => {
      setPrefs((prev) => ({ ...prev, ...patch }));
      if (message) notify(message);
    },
    [notify],
  );

  const setFontScale = useCallback(
    (scale: number) => update({ fontScale: scale }),
    [update],
  );

  const increaseFont = useCallback(() => {
    setPrefs((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev.fontScale as (typeof FONT_SCALE_STEPS)[number]);
      const next = FONT_SCALE_STEPS[Math.min(idx < 0 ? 2 : idx + 1, FONT_SCALE_STEPS.length - 1)];
      return { ...prev, fontScale: next };
    });
  }, []);

  const decreaseFont = useCallback(() => {
    setPrefs((prev) => {
      const idx = FONT_SCALE_STEPS.indexOf(prev.fontScale as (typeof FONT_SCALE_STEPS)[number]);
      const next = FONT_SCALE_STEPS[Math.max(idx < 0 ? 0 : idx - 1, 0)];
      return { ...prev, fontScale: next };
    });
  }, []);

  const toggle = useCallback(
    (key: keyof Omit<AccessibilityPreferences, "fontScale">) => {
      setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  const reset = useCallback(() => {
    setPrefs(DEFAULT_A11Y_PREFERENCES);
    notify("");
  }, [notify]);

  const value = useMemo(
    () => ({ prefs, announce, setFontScale, increaseFont, decreaseFont, toggle, reset }),
    [prefs, announce, setFontScale, increaseFont, decreaseFont, toggle, reset],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
