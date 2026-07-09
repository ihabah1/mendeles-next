"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { ControlCenter } from "@/components/control-center/control-center";
import { ClientDashboard } from "@/components/client/client-dashboard";
import { isClientPortalUser } from "@/lib/auth/portal-mode";
import { healthApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardPage() {
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission("tenants.view") || user?.roles.includes("super_admin");
  const isClient = isClientPortalUser(user, hasPermission);
  const health = useQuery({ queryKey: ["health"], queryFn: healthApi.check, enabled: !isAdmin && !isClient });

  if (isAdmin) {
    return <ControlCenter />;
  }

  if (isClient) {
    return <ClientDashboard />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {td("welcome")}, {user?.first_name || user?.email}
      </h1>
      <Card>
        <h2 className="mb-2 font-semibold">{td("health")}</h2>
        {health.isLoading && <p>{tc("loading")}</p>}
        {health.data && (
          <p className="text-sm text-[var(--muted-fg)]">
            {health.data.status} · DB {health.data.database}
          </p>
        )}
      </Card>
      <p className="text-sm text-[var(--muted-fg)]">
        <Link href="/dashboard/users?tab=inbox" className="text-[var(--accent)] hover:underline">
          {td("goToInbox")}
        </Link>
      </p>
    </div>
  );
}
