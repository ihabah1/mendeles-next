"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { auditApi } from "@/lib/api/dashboard";

export default function AuditPage() {
  const t = useTranslations("audit");
  const tc = useTranslations("common");
  const { data, isLoading, isError } = useQuery({ queryKey: ["audit"], queryFn: auditApi.list });

  return (
    <Card>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      {isLoading && <p className="mt-4 text-sm">{tc("loading")}</p>}
      {isError && <p className="mt-4 text-sm text-red-600">{t("loadError")}</p>}
      <ul className="mt-4 space-y-2 text-sm">
        {data?.results?.map((row) => (
          <li key={String(row.id)} className="rounded border p-2">
            <div className="font-medium">{String(row.action)}</div>
            <div className="text-[var(--muted-fg)]">{String(row.created_at)}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
