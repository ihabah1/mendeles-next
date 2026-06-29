"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { auditApi } from "@/lib/api/dashboard";

export default function AuditPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["audit"], queryFn: auditApi.list });

  return (
    <Card>
      <h1 className="text-xl font-bold">יומן פעולות</h1>
      {isLoading && <p className="mt-4 text-sm">טוען…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">שגיאה בטעינת יומן</p>}
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
