"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clientPortalApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";

function statusLabel(t: ReturnType<typeof useTranslations>, status: string) {
  const key = `status_${status}` as "status_queued";
  return t.has(key) ? t(key) : status;
}

export function ClientDashboard() {
  const t = useTranslations("clientPortal");
  const tc = useTranslations("common");
  const { user, refreshSession } = useAuth();
  const qc = useQueryClient();

  const dash = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: clientPortalApi.dashboard,
  });

  const submit = useMutation({
    mutationFn: clientPortalApi.submitRequest,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["client-dashboard"] });
      await qc.invalidateQueries({ queryKey: ["client-requests"] });
      await refreshSession();
    },
  });

  const data = dash.data;
  const balance = data?.credits_balance ?? user?.credits_balance ?? 0;
  const cost = data?.credit_cost_per_product ?? 15;
  const canAfford = balance >= cost;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs text-[var(--muted-fg)]">{t("creditsBalance")}</p>
          <p className="mt-1 text-3xl font-bold">{balance}</p>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("creditCostHint", { cost })}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--muted-fg)]">{t("pendingRequests")}</p>
          <p className="mt-1 text-3xl font-bold">{data?.pending_requests_count ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--muted-fg)]">{t("leadsReceived")}</p>
          <p className="mt-1 text-3xl font-bold">{data?.leads_total ?? 0}</p>
          {(data?.leads_new ?? 0) > 0 && (
            <p className="mt-1 text-xs text-[var(--accent)]">{t("newLeads", { n: data?.leads_new ?? 0 })}</p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--muted-fg)]">{t("unreadMessages")}</p>
          <p className="mt-1 text-3xl font-bold">{data?.inbox_unread ?? 0}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">{t("newRequestTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("newRequestHint")}</p>
        {!canAfford && (
          <p className="mt-3 text-sm text-amber-600">{t("insufficientCredits", { cost, balance })}</p>
        )}
        <form
          className="mt-4 grid gap-4 lg:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            submit.mutate({
              product_type: fd.get("product_type") as "landing_page" | "article",
              title: String(fd.get("title") || ""),
              brief: String(fd.get("brief") || ""),
            });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("productType")}</span>
            <select
              name="product_type"
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              defaultValue="landing_page"
            >
              <option value="landing_page">{t("productLanding")}</option>
              <option value="article">{t("productArticle")}</option>
            </select>
          </label>
          <label className="block text-sm lg:col-span-2">
            <span className="mb-1 block font-medium">{t("requestTitle")}</span>
            <input
              name="title"
              required
              minLength={2}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              placeholder={t("requestTitlePlaceholder")}
            />
          </label>
          <label className="block text-sm lg:col-span-2">
            <span className="mb-1 block font-medium">{t("requestBrief")}</span>
            <textarea
              name="brief"
              rows={4}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              placeholder={t("requestBriefPlaceholder")}
            />
          </label>
          <div className="lg:col-span-2">
            <Button type="submit" disabled={!canAfford || submit.isPending}>
              {submit.isPending ? tc("loading") : t("submitRequest", { cost })}
            </Button>
            {submit.isError && (
              <p className="mt-2 text-sm text-red-600">{(submit.error as Error).message}</p>
            )}
            {submit.isSuccess && <p className="mt-2 text-sm text-green-600">{t("requestSubmitted")}</p>}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t("myRequests")}</h2>
          <Link href="/dashboard/requests" className="text-sm text-[var(--accent)] hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        {dash.isLoading && <p className="mt-4 text-sm">{tc("loading")}</p>}
        {!dash.isLoading && (data?.requests.length ?? 0) === 0 && (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">{t("noRequests")}</p>
        )}
        <ul className="mt-4 divide-y">
          {data?.requests.map((req) => (
            <li key={req.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">{req.title}</p>
                <p className="text-xs text-[var(--muted-fg)]">
                  {req.product_label} · {statusLabel(t, req.status)}
                </p>
              </div>
              <span className="text-xs text-[var(--muted-fg)]">
                {req.created_at ? new Date(req.created_at).toLocaleDateString() : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard/leads" className="text-[var(--accent)] hover:underline">
          {t("goToLeads")}
        </Link>
        <Link href="/dashboard/inbox" className="text-[var(--accent)] hover:underline">
          {t("goToInbox")}
        </Link>
        <Link href="/dashboard/profile" className="text-[var(--accent)] hover:underline">
          {t("goToProfile")}
        </Link>
      </div>
    </div>
  );
}
