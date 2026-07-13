import {
  ADMIN_INTERFACE_DEFS,
  AUTH_INTERFACE_DEFS,
  PUBLIC_INTERFACE_DEFS,
} from "@/lib/admin/site-interfaces";
import type { Locale } from "@/lib/i18n/routing";
import { routing } from "@/lib/i18n/routing";

export function localizePath(href: string, locale: Locale): string {
  if (locale === "he") return href;
  if (href === "/") return `/${locale}`;
  return `/${locale}${href}`;
}

const PUBLIC_EXTRA = [{ id: "blog", href: "/blog" }];

export function allPublicAuditPaths(): string[] {
  const hrefs = [...PUBLIC_INTERFACE_DEFS, ...AUTH_INTERFACE_DEFS, ...PUBLIC_EXTRA].map((item) => item.href);
  return [...new Set(hrefs)];
}

export function allAdminAuditPaths(): string[] {
  return ADMIN_INTERFACE_DEFS.map((item) => item.href);
}

export function localizedAuditPaths(locale: Locale, paths: string[]): string[] {
  return paths.map((path) => localizePath(path, locale));
}

export function allSiteAuditPaths(): Array<{ locale: Locale; path: string }> {
  const locales = [...routing.locales] as Locale[];
  const publicPaths = allPublicAuditPaths();
  const adminPaths = allAdminAuditPaths();
  const entries: Array<{ locale: Locale; path: string }> = [];

  for (const locale of locales) {
    for (const path of [...publicPaths, ...adminPaths]) {
      entries.push({ locale, path: localizePath(path, locale) });
    }
  }

  return entries;
}
