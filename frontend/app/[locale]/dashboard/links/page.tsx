"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import {
  ADMIN_INTERFACE_DEFS,
  API_INTERFACE_DEFS,
  AUTH_INTERFACE_DEFS,
  PUBLIC_INTERFACE_DEFS,
  filterAdminInterfaces,
  type InterfaceCategory,
  type SiteInterfaceDef,
} from "@/lib/admin/site-interfaces";
import { useAuth } from "@/lib/auth/auth-context";

type ResolvedLink = SiteInterfaceDef & { label: string; description?: string };

function resolveLabel(
  item: SiteInterfaceDef,
  t: ReturnType<typeof useTranslations<"siteLinks">>,
  tSolutions: ReturnType<typeof useTranslations<"landing.solutions">>,
  tIndustries: ReturnType<typeof useTranslations<"landing.industries">>,
): { label: string; description?: string } {
  if (item.id.startsWith("solution-")) {
    const slug = item.id.replace("solution-", "");
    return {
      label: tSolutions(`items.${slug}.title`),
      description: tSolutions(`items.${slug}.desc`),
    };
  }
  if (item.id.startsWith("industry-")) {
    const slug = item.id.replace("industry-", "");
    return {
      label: tIndustries(`pages.${slug}.title`),
      description: tIndustries(`pages.${slug}.subtitle`),
    };
  }
  const label = t.has(`items.${item.id}.label` as "items.dashboard.label")
    ? t(`items.${item.id}.label` as "items.dashboard.label")
    : item.id;
  const description = t.has(`items.${item.id}.description` as "items.dashboard.description")
    ? t(`items.${item.id}.description` as "items.dashboard.description")
    : undefined;
  return { label, description };
}

function InterfaceGroup({
  category,
  items,
}: {
  category: InterfaceCategory;
  items: ResolvedLink[];
}) {
  const t = useTranslations("siteLinks");

  if (!items.length) return null;

  return (
    <Card>
      <h2 className="mb-1 text-lg font-semibold">{t(`categories.${category}`)}</h2>
      <p className="mb-4 text-sm text-[var(--muted-fg)]">{t(`categories.${category}Hint`)}</p>
      <ul className="divide-y divide-[var(--border)]">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              {item.openInNewTab ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {item.label}
                  <span className="ms-1 text-xs text-[var(--muted-fg)]">↗</span>
                </a>
              ) : (
                <Link href={item.href} className="font-medium text-[var(--accent)] hover:underline">
                  {item.label}
                </Link>
              )}
              {item.description && (
                <p className="mt-0.5 text-sm text-[var(--muted-fg)]">{item.description}</p>
              )}
            </div>
            <code className="shrink-0 rounded bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-fg)]">
              {item.href}
            </code>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function AdminLinksPage() {
  const t = useTranslations("siteLinks");
  const tSolutions = useTranslations("landing.solutions");
  const tIndustries = useTranslations("landing.industries");
  const { user, hasPermission } = useAuth();
  const isAdmin = Boolean(hasPermission("tenants.view") || user?.roles.includes("super_admin"));

  const groups = useMemo(() => {
    const resolve = (defs: SiteInterfaceDef[]) =>
      defs.map((item) => ({
        ...item,
        ...resolveLabel(item, t, tSolutions, tIndustries),
      }));

    return {
      admin: resolve(filterAdminInterfaces(ADMIN_INTERFACE_DEFS, hasPermission, isAdmin)),
      auth: resolve(AUTH_INTERFACE_DEFS),
      public: resolve(PUBLIC_INTERFACE_DEFS),
      api: resolve(API_INTERFACE_DEFS),
    };
  }, [hasPermission, isAdmin, t, tSolutions, tIndustries]);

  if (!isAdmin) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  const total =
    groups.admin.length + groups.auth.length + groups.public.length + groups.api.length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-[var(--muted-fg)]">{t("count", { n: total })}</p>
      </div>

      <InterfaceGroup category="admin" items={groups.admin} />
      <InterfaceGroup category="auth" items={groups.auth} />
      <InterfaceGroup category="public" items={groups.public} />
      <InterfaceGroup category="api" items={groups.api} />
    </div>
  );
}
