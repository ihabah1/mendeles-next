"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { inboxApi, usersApi } from "@/lib/api/dashboard";

export function MessagesPanel() {
  const t = useTranslations("messagesAdmin");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const [form, setForm] = useState({ subject: "", body: "", recipient_id: "", broadcast: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendMutation = useMutation({
    mutationFn: () => inboxApi.send({ subject: form.subject, body: form.body, broadcast: form.broadcast, recipient_id: form.broadcast ? undefined : form.recipient_id }),
    onSuccess: (res) => {
      setMessage("message" in res ? res.message : t("sent"));
      setForm({ subject: "", body: "", recipient_id: "", broadcast: false });
      setError("");
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card className="p-6">
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }}>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.broadcast} onChange={(e) => setForm({ ...form, broadcast: e.target.checked })} />{t("broadcastAll")}</label>
        {!form.broadcast && (
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted-fg)]">{t("recipient")}</span>
            <select className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm" value={form.recipient_id} onChange={(e) => setForm({ ...form, recipient_id: e.target.value })} required>
              <option value="">{t("selectRecipient")}</option>
              {users.data?.results.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm"><span className="mb-1 block text-[var(--muted-fg)]">{t("subject")}</span><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
        <label className="block text-sm"><span className="mb-1 block text-[var(--muted-fg)]">{t("body")}</span><textarea required rows={5} className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
        <Button type="submit" disabled={sendMutation.isPending}>{sendMutation.isPending ? tc("loading") : t("send")}</Button>
      </form>
    </Card>
  );
}
