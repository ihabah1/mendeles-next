"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { usersApi } from "@/lib/api/dashboard";

export default function UsersPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });

  return (
    <Card>
      <h1 className="text-xl font-bold">משתמשים</h1>
      {isLoading && <p className="mt-4 text-sm">טוען…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">שגיאה בטעינת משתמשים</p>}
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
