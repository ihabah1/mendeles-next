export type ProfileTabId = "details" | "password" | "topup" | "orders" | "inbox";

export const PROFILE_TABS: {
  id: ProfileTabId;
  href: string;
  label: string;
  icon: string;
}[] = [
  { id: "details", href: "/profile/details", label: "פרטים אישיים", icon: "👤" },
  { id: "password", href: "/profile/password", label: "סיסמה", icon: "🔐" },
  { id: "topup", href: "/profile/topup", label: "טעינת כסף", icon: "💳" },
  { id: "orders", href: "/profile/orders", label: "היסטוריית רכישות", icon: "📋" },
  { id: "inbox", href: "/profile/inbox", label: "תיבת דואר", icon: "📬" },
];

export function tabFromPath(pathname: string | null): ProfileTabId {
  const hit = PROFILE_TABS.find((t) => pathname === t.href || pathname?.startsWith(t.href + "/"));
  return hit?.id ?? "details";
}
