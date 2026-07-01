"use client";

import { useEffect, type RefObject } from "react";
import { getFocusableElements, trapFocus } from "./focus-trap";

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (event: KeyboardEvent) => trapFocus(container, event);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

export function focusFirstElement(container: HTMLElement | null) {
  if (!container) return;
  getFocusableElements(container)[0]?.focus();
}
