export type AdminTabId =
  | "dashboard"
  | "orders"
  | "users"
  | "monitoring"
  | "services"
  | "kiosks";

export function adminTabFromPath(pathname: string): AdminTabId {
  if (
    pathname.startsWith("/admin/orders") ||
    pathname.startsWith("/admin/print-queue") ||
    pathname.startsWith("/admin/scan")
  ) {
    return "orders";
  }
  if (
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/permissions") ||
    pathname.startsWith("/admin/balance") ||
    pathname.startsWith("/admin/messages") ||
    pathname.startsWith("/admin/support")
  ) {
    return "users";
  }
  if (pathname.startsWith("/admin/monitoring")) return "monitoring";
  if (pathname.startsWith("/admin/services")) return "services";
  if (pathname.startsWith("/admin/kiosks")) return "kiosks";
  return "dashboard";
}
