"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { adminApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { OverviewPanel } from "@/components/control-center/overview-panel";
import { FeatureFlagsPanel } from "@/components/control-center/feature-flags-panel";
import { RecentChangesPanel } from "@/components/control-center/recent-changes-panel";
import { ErrorLogsPanel } from "@/components/control-center/error-logs-panel";
import { ClientPermissionsPanel } from "@/components/control-center/client-permissions-panel";

export type ControlCenterTab = "overview" | "flags" | "changes" | "errors" | "permissions";

function ControlCenterInner() {
  const t = useTranslations("controlCenter");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = hasPermission("tenants.view") || user?.roles.includes("super_admin");

  const tabParam = (searchParams.get("tab") as ControlCenterTab) || "overview";
  const center = useQuery({
    queryKey: ["control-center"],
    queryFn: adminApi.controlCenter,
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const tabs: { id: ControlCenterTab; label: string }[] = [
    { id: "overview", label: t("tabOverview") },
    { id: "flags", label: t("tabFlags") },
    { id: "changes", label: t("tabChanges") },
    { id: "errors", label: t("tabErrors") },
    { id: "permissions", label: t("tabPermissions") },
  ];

  const activeTab = tabs.find((tab) => tab.id === tabParam)?.id ?? "overview";

  function setTab(tab: ControlCenterTab) {
    router.replace(`/dashboard?tab=${tab}`);
  }

  if (!isAdmin) return null;

  return (
    <div className="control-center -m-6 min-h-[calc(100vh-0px)] p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--cc-muted)]">
            {t("greeting", { name: user?.first_name || user?.email || "" })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--cc-muted)]">{t("subtitle")}</p>
        </div>
        <div className="cc-card px-4 py-2 text-sm text-[var(--cc-muted)]">
          {new Date().toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </header>

      <nav className="cc-tabs" aria-label={t("tabsLabel")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={cn("cc-tab", activeTab === tab.id && "cc-tab--active")}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {center.isLoading && <p className="text-sm text-[var(--cc-muted)]">{tc("loading")}</p>}
      {center.isError && <p className="text-sm text-red-400">{t("loadError")}</p>}

      {center.data && (
        <div className="mt-6">
          {activeTab === "overview" && <OverviewPanel data={center.data} />}
          {activeTab === "flags" && <FeatureFlagsPanel data={center.data} locale={locale} />}
          {activeTab === "changes" && <RecentChangesPanel data={center.data} />}
          {activeTab === "errors" && <ErrorLogsPanel data={center.data} />}
          {activeTab === "permissions" && <ClientPermissionsPanel data={center.data} />}
        </div>
      )}
    </div>
  );
}

export function ControlCenter() {
  const tc = useTranslations("common");
  return (
    <Suspense fallback={<p className="text-sm">{tc("loading")}</p>}>
      <ControlCenterInner />
    </Suspense>
  );
}
