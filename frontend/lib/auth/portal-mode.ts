import type { AuthUser } from "@/lib/api/auth";

export function isClientPortalUser(
  user: AuthUser | null,
  hasPermission: (perm: string) => boolean,
): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin") || user.roles.includes("platform_admin")) return false;
  if (hasPermission("tenants.view")) return false;
  return user.roles.includes("client") || hasPermission("requests.view");
}
