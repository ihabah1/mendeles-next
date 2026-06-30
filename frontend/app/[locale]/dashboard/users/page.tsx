"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { usersApi } from "@/lib/api/dashboard";

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const { data, isLoading, isError } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Card className="overflow-hidden p-0">
        {isLoading && <p className="p-6 text-sm">{tc("loading")}</p>}
        {isError && <p className="p-6 text-sm text-red-600">{t("loadError")}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-start text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colEmail")}</th>
                <th className="px-4 py-3 font-medium">{t("colName")}</th>
                <th className="px-4 py-3 font-medium">{t("colRoles")}</th>
                <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.results?.map((u) => (
                <tr key={String(u.id)} className="hover:bg-[var(--muted)]/30">
                  <td className="px-4 py-3 font-medium">{String(u.email)}</td>
                  <td className="px-4 py-3 text-[var(--muted-fg)]">
                    {String(u.first_name)} {String(u.last_name)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {((u.roles as string[]) || []).map((r) => (
                        <span key={r} className="rounded bg-[var(--accent-muted)] px-2 py-0.5 text-xs">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.is_active
                          ? "text-[var(--success)]"
                          : "text-[var(--muted-fg)]"
                      }
                    >
                      {u.is_active ? t("active") : t("inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
