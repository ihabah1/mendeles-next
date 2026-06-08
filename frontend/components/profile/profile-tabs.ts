export type ProfileTabId = "details" | "password" | "topup" | "forms" | "orders";

export const PROFILE_TABS: {
  id: ProfileTabId;
  href: string;
  label: string;
  icon: string;
}[] = [
  { id: "details", href: "/profile/details", label: "פרטים אישיים", icon: "👤" },
  { id: "password", href: "/profile/password", label: "סיסמה", icon: "🔐" },
  { id: "topup", href: "/profile/topup", label: "טעינת כסף", icon: "💳" },
  { id: "forms", href: "/profile/forms", label: "טפסים שלי", icon: "🎱" },
  { id: "orders", href: "/profile/orders", label: "היסטוריית רכישות", icon: "📋" },
];

export function tabFromPath(pathname: string | null): ProfileTabId {
  const hit = PROFILE_TABS.find((t) => pathname === t.href || pathname?.startsWith(t.href + "/"));
  return hit?.id ?? "details";
}
