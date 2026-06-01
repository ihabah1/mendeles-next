import { NextResponse } from "next/server";

/**
 * Auth is enforced client-side via the React <AuthProvider> + <ProtectedRoute>
 * components, which rely on the Django JWT stored in localStorage (not on a
 * cookie this edge middleware can read). This middleware is intentionally a
 * pass-through; route protection lives in components/ProtectedRoute.tsx.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
