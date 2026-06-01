"use client";

import { useEffect, useState } from "react";

import { resolveBackendOriginUrl } from "@/lib/api/config";

/** Django origin for external links (/manage, /admin) in the browser. */
export function useBackendOrigin(): string {
  const [origin, setOrigin] = useState("http://localhost:8000");

  useEffect(() => {
    resolveBackendOriginUrl().then(setOrigin);
  }, []);

  return origin;
}
