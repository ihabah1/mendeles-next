"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { clientPortalApi } from "@/lib/api/dashboard";

export default function ClientRequestsPage() {
  const t = useTranslations("clientPortal");
  const tc = useTranslations("common");
  const requests = useQuery({ queryKey: ["client-requests"], queryFn: clientPortalApi.listRequests });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("requestsPageTitle")}</h1>
      <Card className="overflow-hidden p-0">
        {requests.isLoading && <p className="p-6 text-sm">{tc("loading")}</p>}
        {!requests.isLoading && (requests.data?.results.length ?? 0) === 0 && (
          <p className="p-6 text-sm text-[var(--muted-fg)]">{t("noRequests")}</p>
        )}
        <ul className="divide-y">
          {requests.data?.results.map((req) => (
            <li key={req.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{req.title}</p>
                  <p className="text-xs text-[var(--muted-fg)]">
                    {req.product_label} · {t.has(`status_${req.status}` as "status_queued") ? t(`status_${req.status}` as "status_queued") : req.status}
                  </p>
                  {req.brief && <p className="mt-2 whitespace-pre-wrap text-[var(--muted-fg)]">{req.brief}</p>}
                  {req.client_email && (
                    <p className="mt-2 text-xs text-[var(--muted-fg)]">
                      {req.client_name || req.client_email} · {req.tenant_name}
                    </p>
                  )}
                </div>
                <span className="text-xs text-[var(--muted-fg)]">
                  {req.created_at ? new Date(req.created_at).toLocaleString() : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
