export type ProfileTabId = "details" | "topup" | "orders";

export const PROFILE_TABS: {
  id: ProfileTabId;
  href: string;
  label: string;
  icon: string;
}[] = [
  { id: "details", href: "/profile/details", label: "פרטים אישיים", icon: "👤" },
  { id: "topup", href: "/profile/topup", label: "טעינת כסף", icon: "💳" },
  { id: "orders", href: "/profile/orders", label: "אזור אישי", icon: "📋" },
];

export function tabFromPath(pathname: string | null): ProfileTabId | null {
  if (pathname?.startsWith("/profile/inbox")) return null;
  if (pathname?.startsWith("/profile/password")) return "details";
  const hit = PROFILE_TABS.find((t) => pathname === t.href || pathname?.startsWith(t.href + "/"));
  return hit?.id ?? "orders";
}
