"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { UsersPanel } from "@/components/users/users-panel";
import { LoginsPanel } from "@/components/users/logins-panel";
import { ReleasePanel } from "@/components/users/release-panel";
import { MessagesPanel } from "@/components/users/messages-panel";
import { InboxPanel } from "@/components/users/inbox-panel";

export type UsersTab = "users" | "logins" | "release" | "messages" | "inbox";

function UsersHubInner() {
  const t = useTranslations("usersHub");
  const tc = useTranslations("common");
  const { hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const canView = hasPermission("users.view");
  const canInvite = hasPermission("users.invite");
  const canEdit = hasPermission("users.edit");
  const canRemove = hasPermission("users.remove");
  const canChangeRoles = hasPermission("users.change_roles");
  const canPlatform = hasPermission("tenants.view");

  const tabParam = (searchParams.get("tab") as UsersTab) || (canView ? "users" : "inbox");

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tabs: { id: UsersTab; label: string; show: boolean }[] = [
    { id: "users", label: t("tabUsers"), show: canView },
    { id: "logins", label: t("tabLogins"), show: canView },
    { id: "release", label: t("tabRelease"), show: canPlatform },
    { id: "messages", label: t("tabMessages"), show: canEdit },
    { id: "inbox", label: t("tabInbox"), show: true },
  ];

  const activeTab =
    tabs.find((tab) => tab.id === tabParam && tab.show)?.id ?? tabs.find((tab) => tab.show)?.id ?? "inbox";

  function setTab(tab: UsersTab) {
    router.replace(`/dashboard/users?tab=${tab}`);
  }

  if (!tabs.some((tab) => tab.show)) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--muted-fg)]">{t("noAccess")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-1" aria-label={t("tabsLabel")}>
        {tabs.filter((tab) => tab.show).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={cn(
              "rounded-t-md px-4 py-2 text-sm font-medium transition",
              activeTab === tab.id
                ? "border border-b-0 border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                : "text-[var(--muted-fg)] hover:bg-[var(--muted)]/50",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "users" && (
        <UsersPanel
          canInvite={canInvite}
          canEdit={canEdit}
          canRemove={canRemove}
          canChangeRoles={canChangeRoles}
          error={error}
          setError={setError}
          message={message}
          setMessage={setMessage}
        />
      )}
      {activeTab === "logins" && <LoginsPanel />}
      {activeTab === "release" && canPlatform && <ReleasePanel />}
      {activeTab === "messages" && canEdit && <MessagesPanel />}
      {activeTab === "inbox" && <InboxPanel />}
    </div>
  );
}

export function UsersHub() {
  const tc = useTranslations("common");
  return (
    <Suspense fallback={<p className="text-sm">{tc("loading")}</p>}>
      <UsersHubInner />
    </Suspense>
  );
}
