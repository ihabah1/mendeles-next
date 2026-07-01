export function buildCanonicalUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function localizePath(path: string, locale: string): string {
  if (locale === "he") return path;
  if (path === "/") return "/en";
  return `/${locale}${path}`;
}
