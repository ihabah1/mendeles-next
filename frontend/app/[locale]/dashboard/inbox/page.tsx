"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inboxApi } from "@/lib/api/dashboard";

export default function InboxPage() {
  const t = useTranslations("inbox");
  const tc = useTranslations("common");
  const qc = useQueryClient();

  const inbox = useQuery({ queryKey: ["inbox"], queryFn: () => inboxApi.list() });

  const markRead = useMutation({
    mutationFn: (id: string) => inboxApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {inbox.data && inbox.data.unread_count > 0 && (
            <p className="text-sm text-[var(--muted-fg)]">
              {t("unreadCount", { n: inbox.data.unread_count })}
            </p>
          )}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {inbox.isLoading && <p className="p-6 text-sm">{tc("loading")}</p>}
        {inbox.isError && <p className="p-6 text-sm text-red-600">{t("loadError")}</p>}
        {!inbox.isLoading && inbox.data?.results.length === 0 && (
          <p className="p-6 text-sm text-[var(--muted-fg)]">{t("empty")}</p>
        )}
        <ul className="divide-y divide-[var(--border)]">
          {inbox.data?.results.map((msg) => (
            <li
              key={msg.id}
              className={`p-4 ${msg.read_at ? "opacity-80" : "bg-[var(--accent-muted)]/20"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{msg.subject}</p>
                  <p className="mt-1 text-xs text-[var(--muted-fg)]">
                    {msg.sender_name || msg.sender_email || t("systemSender")} ·{" "}
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{msg.body}</p>
                </div>
                {!msg.read_at && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(msg.id)}
                  >
                    {t("markRead")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
