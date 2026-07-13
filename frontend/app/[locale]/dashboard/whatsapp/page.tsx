"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { whatsappApi } from "@/lib/api/whatsapp";
import { useAuth } from "@/lib/auth/auth-context";

const STATUS_ICON: Record<string, string> = {
  connected: "🟢",
  connecting: "🟡",
  not_connected: "🔴",
  disconnected: "🔴",
  error: "🔴",
};

export default function WhatsAppDashboardPage() {
  const t = useTranslations("whatsappDashboard");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const canView = hasPermission("integrations.view");
  const canManage = hasPermission("integrations.manage");
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: whatsappApi.status,
    enabled: canView,
  });

  const health = useQuery({
    queryKey: ["whatsapp-health"],
    queryFn: whatsappApi.health,
    enabled: canView,
  });

  const qr = useQuery({
    queryKey: ["whatsapp-qr"],
    queryFn: whatsappApi.qr,
    enabled: canView && status.data?.qr_status === "pending",
  });

  const connect = useMutation({
    mutationFn: whatsappApi.connect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-qr"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-health"] });
    },
  });

  const disconnect = useMutation({
    mutationFn: whatsappApi.disconnect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-health"] });
    },
  });

  const refresh = useMutation({
    mutationFn: whatsappApi.refresh,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-health"] });
    },
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  const data = status.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-[var(--muted-fg)] hover:underline">
          ← {t("backToDashboard")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t("connectionTitle")}</h2>
            <p className="mt-1 text-sm text-[var(--muted-fg)]">{data?.message || t("notConnected")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              variant="outline"
            >
              {refresh.isPending ? tc("loading") : t("refreshStatus")}
            </Button>
            {canManage && (
              <>
                <Button type="button" onClick={() => connect.mutate()} disabled={connect.isPending}>
                  {connect.isPending ? tc("loading") : t("connect")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  {disconnect.isPending ? tc("loading") : t("disconnect")}
                </Button>
              </>
            )}
          </div>
        </div>

        {status.isLoading ? (
          <p className="mt-4 text-sm">{tc("loading")}</p>
        ) : (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("provider")}</dt>
              <dd className="font-medium">{data?.provider || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("connectionStatus")}</dt>
              <dd className="font-medium">
                {STATUS_ICON[data?.connection_status || "not_connected"] || ""}{" "}
                {data?.connection_status || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("instance")}</dt>
              <dd className="font-medium">{data?.instance || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("phoneNumber")}</dt>
              <dd className="font-medium">{data?.phone_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("qrStatus")}</dt>
              <dd className="font-medium">{data?.qr_status || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("health")}</dt>
              <dd className="font-medium">{health.data?.status || data?.health || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("lastSync")}</dt>
              <dd className="font-medium">
                {data?.last_sync_at ? new Date(data.last_sync_at).toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-fg)]">{t("configured")}</dt>
              <dd className="font-medium">{data?.configured ? t("yes") : t("no")}</dd>
            </div>
          </dl>
        )}

        {(connect.isError || disconnect.isError || refresh.isError) && (
          <p className="mt-4 text-sm text-red-600">
            {(connect.error || disconnect.error || refresh.error)?.message}
          </p>
        )}
        {(connect.data?.message || disconnect.data?.message) && (
          <p className="mt-4 text-sm text-green-600">{connect.data?.message || disconnect.data?.message}</p>
        )}
      </Card>

      {qr.data?.qr_code && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold">{t("qrTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">{qr.data.message}</p>
          <img
            src={qr.data.qr_code}
            alt={t("qrAlt")}
            className="mt-4 max-w-xs rounded-lg border border-[var(--border)]"
          />
        </Card>
      )}
    </div>
  );
}
