import type { BreadcrumbItem } from "./types";

export function buildBreadcrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
  return items.map((item, idx) => ({
    ...item,
    url: item.url ?? item.path,
    position: idx + 1,
  })) as BreadcrumbItem[];
}

export function staticPageBreadcrumbs(homeLabel: string, segments: BreadcrumbItem[]): BreadcrumbItem[] {
  return buildBreadcrumbs([{ name: homeLabel, path: "/" }, ...segments]);
}
