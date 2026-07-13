export function isMarketingPage(pathname: string): boolean {
  const blocked = [
    "/dashboard",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];
  return !blocked.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
