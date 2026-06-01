/**
 * SSR-safe JWT token storage.
 *
 * Access + refresh tokens issued by Django (simplejwt) are persisted in
 * localStorage. All access goes through these helpers so storage details
 * stay in one place and can be swapped (e.g. for cookies) later.
 */
const ACCESS_KEY = "mandeles_access_token";
const REFRESH_KEY = "mandeles_refresh_token";

const isBrowser = () => typeof window !== "undefined";

export const tokenStore = {
  getAccess(): string | null {
    return isBrowser() ? window.localStorage.getItem(ACCESS_KEY) : null;
  },
  getRefresh(): string | null {
    return isBrowser() ? window.localStorage.getItem(REFRESH_KEY) : null;
  },
  set(access: string, refresh?: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess(access: string): void {
    if (isBrowser()) window.localStorage.setItem(ACCESS_KEY, access);
  },
  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
  hasSession(): boolean {
    return Boolean(this.getAccess());
  },
};
