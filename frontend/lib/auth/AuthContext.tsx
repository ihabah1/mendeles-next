"use client";

/**
 * Global authentication state backed by the Django JWT API.
 *
 * Wrap the app in <AuthProvider> (see app/layout.tsx) and consume it with the
 * useAuth() hook. On mount it restores the session from the stored refresh
 * token by calling /auth/me/.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authService } from "@/lib/api/auth";
import { setOnAuthFailure } from "@/lib/api/client";
import { primeApiBaseUrl } from "@/lib/api/config";
import { tokenStore } from "@/lib/api/tokens";
import type { ApiUser, RegisterPayload, RegisterResponse, UserRole } from "@/lib/api/types";

function canAccessAdminPortal(user: ApiUser | null): boolean {
  if (!user?.is_staff) return false;
  const role = user.role as UserRole;
  return role === "team" || role === "admin";
}

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<ApiUser | null>;
  /** Set session from verify-email / verify-phone without an extra /me/ round-trip. */
  establishSession: (
    user: ApiUser,
    tokens?: { access: string; refresh: string },
  ) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refreshUser = useCallback(async (): Promise<ApiUser | null> => {
    if (!tokenStore.hasSession()) {
      setUser(null);
      return null;
    }
    try {
      const me = await authService.me();
      if (mounted.current) setUser(me);
      return me;
    } catch {
      if (mounted.current) setUser(null);
      return null;
    }
  }, []);

  // Restore session on first load.
  useEffect(() => {
    mounted.current = true;
    (async () => {
      await primeApiBaseUrl().catch(() => {});
      await refreshUser();
      if (mounted.current) setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, [refreshUser]);

  // When a token refresh ultimately fails, drop the user from state.
  useEffect(() => {
    setOnAuthFailure(() => setUser(null));
    return () => setOnAuthFailure(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedIn } = await authService.login(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    return authService.register(payload);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const establishSession = useCallback(
    (sessionUser: ApiUser, tokens?: { access: string; refresh: string }) => {
      if (tokens?.access && tokens?.refresh) {
        tokenStore.set(tokens.access, tokens.refresh);
      }
      setUser(sessionUser);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.is_admin) && canAccessAdminPortal(user),
      isStaff: canAccessAdminPortal(user),
      login,
      register,
      logout,
      refreshUser,
      establishSession,
    }),
    [user, loading, login, register, logout, refreshUser, establishSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
