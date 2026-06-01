"use client";

/**
 * Client-side route guard.
 *
 * Renders children only for authenticated users. While the session is being
 * restored it shows a fallback; unauthenticated users are redirected to the
 * auth page (preserving where they came from). Pass `adminOnly` to also
 * require staff/admin privileges.
 */
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  /** Allow demo_mode in localStorage without a JWT session (lotto page). */
  allowDemo?: boolean;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  adminOnly = false,
  allowDemo = false,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isStaff, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [demoAllowed, setDemoAllowed] = useState(false);

  useEffect(() => {
    if (allowDemo) {
      setDemoAllowed(localStorage.getItem("demo_mode") === "1");
    }
  }, [allowDemo]);

  const allowed =
    (isAuthenticated || demoAllowed) && (!adminOnly || isStaff);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !demoAllowed) {
      router.replace(`/auth?redirect=${encodeURIComponent(pathname || "/")}`);
    } else if (adminOnly && !isStaff) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, isStaff, adminOnly, demoAllowed, pathname, router]);

  if (loading) {
    return (
      <>
        {fallback ?? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            טוען...
          </div>
        )}
      </>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
