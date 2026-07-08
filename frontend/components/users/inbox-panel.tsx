"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inboxApi } from "@/lib/api/dashboard";

export function InboxPanel() {
  const t = useTranslations("inbox");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: () => inboxApi.list() });
  const markRead = useMutation({
    mutationFn: (id: string) => inboxApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  return (
    <Card className="overflow-hidden p-0">
      {inbox.data && inbox.data.unread_count > 0 && (
        <p className="border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-fg)]">{t("unreadCount", { n: inbox.data.unread_count })}</p>
      )}
      {inbox.isLoading && <p className="p-6 text-sm">{tc("loading")}</p>}
      {inbox.isError && <p className="p-6 text-sm text-red-600">{t("loadError")}</p>}
      {!inbox.isLoading && inbox.data?.results.length === 0 && <p className="p-6 text-sm text-[var(--muted-fg)]">{t("empty")}</p>}
      <ul className="divide-y">
        {inbox.data?.results.map((msg) => (
          <li key={msg.id} className={`p-4 ${msg.read_at ? "opacity-80" : "bg-[var(--accent-muted)]/20"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{msg.subject}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">{msg.sender_name || msg.sender_email || t("systemSender")} · {new Date(msg.created_at).toLocaleString()}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{msg.body}</p>
              </div>
              {!msg.read_at && <Button type="button" variant="ghost" size="sm" disabled={markRead.isPending} onClick={() => markRead.mutate(msg.id)}>{t("markRead")}</Button>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
