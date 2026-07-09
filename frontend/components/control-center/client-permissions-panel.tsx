"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { ControlCenterData } from "@/lib/api/dashboard";

export function ClientPermissionsPanel({ data }: { data: ControlCenterData }) {
  const t = useTranslations("controlCenter");

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="cc-card xl:col-span-1">
        <div className="border-b border-[var(--cc-border)] px-5 py-4">
          <h3 className="font-semibold">{t("rolesSummaryTitle")}</h3>
        </div>
        <ul className="divide-y divide-[var(--cc-border)]">
          {data.role_summary.length === 0 ? (
            <li className="px-5 py-6 text-sm text-[var(--cc-muted)]">{t("noRoles")}</li>
          ) : (
            data.role_summary.map((row) => (
              <li key={row.slug} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{row.name || row.slug}</span>
                <span className="font-semibold text-[var(--cc-accent)]">{row.count}</span>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-[var(--cc-border)] px-5 py-3">
          <Link href="/dashboard/roles" className="text-xs text-[var(--cc-accent)] hover:underline">
            {t("manageRoles")}
          </Link>
        </div>
      </div>

      <div className="cc-card overflow-hidden xl:col-span-2">
        <div className="flex items-center justify-between border-b border-[var(--cc-border)] px-5 py-4">
          <div>
            <h3 className="font-semibold">{t("clientPermissionsTitle")}</h3>
            <p className="mt-1 text-sm text-[var(--cc-muted)]">{t("clientPermissionsHint")}</p>
          </div>
          <Link href="/dashboard/users" className="text-xs text-[var(--cc-accent)] hover:underline">
            {t("manageUsers")}
          </Link>
        </div>
        <table className="cc-table w-full text-sm">
          <thead>
            <tr>
              <th>{t("colUser")}</th>
              <th>{t("colEmail")}</th>
              <th>{t("colRoles")}</th>
              <th>{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {data.client_permissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--cc-muted)]">
                  {t("noUsers")}
                </td>
              </tr>
            ) : (
              data.client_permissions.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.name}</td>
                  <td className="text-[var(--cc-muted)]">{user.email}</td>
                  <td>
                    {user.roles.length === 0
                      ? "—"
                      : user.roles.map((r) => r.name || r.slug).join(", ")}
                  </td>
                  <td>
                    <span className={`cc-badge ${user.is_active ? "cc-badge--ok" : "cc-badge--off"}`}>
                      {user.is_active ? t("active") : t("inactive")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
