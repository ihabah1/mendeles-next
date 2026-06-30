"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { permissionsApi, rolesApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { Link } from "@/lib/i18n/navigation";

export default function RolesPage() {
  const t = useTranslations("roles");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("roles.view");

  const roles = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list, enabled: canView });
  const perms = useQuery({ queryKey: ["permissions"], queryFn: permissionsApi.list, enabled: canView });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm text-[var(--accent)]">
          ← {t("back")}
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">{t("rolesList")}</h2>
          {roles.isLoading && <p className="mt-4 text-sm">{tc("loading")}</p>}
          {roles.isError && <p className="mt-4 text-sm text-red-600">{t("loadError")}</p>}
          <ul className="mt-4 space-y-2">
            {roles.data?.results.map((role) => (
              <li key={role.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{role.name}</span>
                  {role.is_system && (
                    <span className="rounded bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] uppercase text-[var(--accent)]">
                      {t("system")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">{role.slug}</p>
                {role.permissions && role.permissions.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--muted-fg)]">
                    {role.permissions.length} {t("permCount")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold">{t("permissionsList")}</h2>
          {perms.isLoading && <p className="mt-4 text-sm">{tc("loading")}</p>}
          <ul className="mt-4 max-h-96 space-y-1 overflow-y-auto text-sm">
            {perms.data?.results.map((p) => (
              <li key={p.codename} className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-[var(--muted)]">
                <code className="text-xs">{p.codename}</code>
                <span className="text-end text-xs text-[var(--muted-fg)]">{p.module}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
