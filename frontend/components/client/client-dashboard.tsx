"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clientPortalApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

function statusLabel(t: ReturnType<typeof useTranslations>, status: string) {
  const key = `status_${status}` as "status_queued";
  return t.has(key) ? t(key) : status;
}

type ProductType = "landing_page" | "article";

export function ClientDashboard() {
  const t = useTranslations("clientPortal");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const { user, logout, refreshSession } = useAuth();
  const qc = useQueryClient();
  const [productType, setProductType] = useState<ProductType>("landing_page");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");

  const dash = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: clientPortalApi.dashboard,
  });

  const submit = useMutation({
    mutationFn: clientPortalApi.submitRequest,
    onSuccess: async () => {
      setTitle("");
      setBrief("");
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-[var(--accent)]/30 bg-[var(--accent-muted)]/10 p-6">
        <h1 className="text-2xl font-bold">{t("welcome", { name: user?.first_name || "" })}</h1>
        <p className="mt-2 text-lg font-medium">{t("creditsAvailable", { balance })}</p>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("creditsChooseProduct")}</p>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold">{t("chooseProduct")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setProductType("landing_page")}
            className={cn(
              "rounded-xl border p-4 text-start transition",
              productType === "landing_page"
                ? "border-[var(--accent)] bg-[var(--accent-muted)]/20 ring-2 ring-[var(--accent)]/30"
                : "border-[var(--border)] hover:bg-[var(--muted)]",
            )}
          >
            <p className="font-semibold">{t("productLandingFull")}</p>
            <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("productCost", { cost })}</p>
          </button>
          <button
            type="button"
            onClick={() => setProductType("article")}
            className={cn(
              "rounded-xl border p-4 text-start transition",
              productType === "article"
                ? "border-[var(--accent)] bg-[var(--accent-muted)]/20 ring-2 ring-[var(--accent)]/30"
                : "border-[var(--border)] hover:bg-[var(--muted)]",
            )}
          >
            <p className="font-semibold">{t("productArticleFull")}</p>
            <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("productCost", { cost })}</p>
          </button>
        </div>

        {!canAfford && (
          <p className="mt-4 text-sm text-amber-600">{t("insufficientCredits", { cost, balance })}</p>
        )}

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({ product_type: productType, title, brief });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("requestTitle")}</span>
            <input
              required
              minLength={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              placeholder={t("requestTitlePlaceholder")}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("requestBrief")}</span>
            <textarea
              rows={3}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              placeholder={t("requestBriefPlaceholder")}
            />
          </label>
          <Button type="submit" disabled={!canAfford || submit.isPending || title.trim().length < 2}>
            {submit.isPending ? tc("loading") : t("submitRequest", { cost })}
          </Button>
          {submit.isError && <p className="text-sm text-red-600">{(submit.error as Error).message}</p>}
          {submit.isSuccess && <p className="text-sm text-green-600">{t("requestSubmitted")}</p>}
        </form>
      </Card>

      {(data?.requests.length ?? 0) > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold">{t("myRequests")}</h2>
          <ul className="mt-4 divide-y">
            {data?.requests.slice(0, 5).map((req) => (
              <li key={req.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{req.title}</p>
                  <p className="text-xs text-[var(--muted-fg)]">
                    {req.product_label} · {statusLabel(t, req.status)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-semibold">{t("accountActions")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href="/dashboard/profile"
            className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium hover:bg-[var(--muted)]"
          >
            {t("changeDetails")}
          </Link>
          <Link
            href="/forgot-password"
            className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium hover:bg-[var(--muted)]"
          >
            {t("resetPassword")}
          </Link>
          <Link
            href="/dashboard/inbox"
            className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium hover:bg-[var(--muted)]"
          >
            {t("mailbox")}
            {(data?.inbox_unread ?? 0) > 0 && (
              <span className="ms-2 text-xs text-[var(--accent)]">({data?.inbox_unread})</span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-[var(--border)] px-4 py-3 text-start text-sm font-medium hover:bg-[var(--muted)]"
          >
            {tn("logout")}
          </button>
        </div>
        <Link href="/dashboard/leads" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
          {t("goToLeads")}
          {(data?.leads_new ?? 0) > 0 && ` · ${t("newLeads", { n: data?.leads_new ?? 0 })}`}
        </Link>
      </Card>
    </div>
  );
}
