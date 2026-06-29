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
    <Card>
      <h1 className="text-xl font-bold">{t("title")}</h1>
      {isLoading && <p className="mt-4 text-sm">{tc("loading")}</p>}
      {isError && <p className="mt-4 text-sm text-red-600">{t("loadError")}</p>}
      <ul className="mt-4 divide-y">
        {data?.results?.map((u) => (
          <li key={String(u.id)} className="py-3 text-sm">
            <div className="font-medium">{String(u.email)}</div>
            <div className="text-[var(--muted-fg)]">
              {String(u.first_name)} {String(u.last_name)} · {(u.roles as string[])?.join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
