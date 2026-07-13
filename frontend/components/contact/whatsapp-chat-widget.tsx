"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/contact/whatsapp-icon";
import { fetchWhatsAppPublicStatus } from "@/lib/api/whatsapp";
import { focusFirstElement, useFocusTrap } from "@/lib/a11y/use-focus-trap";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  text: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  className?: string;
};

function newId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WhatsAppChatWidget({ open, onClose, className }: Props) {
  const t = useTranslations("whatsappChat");
  const panelId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState(t("notConnected"));
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: newId(), role: "system", text: t("welcome") },
    { id: newId(), role: "system", text: t("notConnected") },
  ]);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    fetchWhatsAppPublicStatus()
      .then((data) => {
        const msg = data.message || t("notConnected");
        setStatusMessage(msg);
        setMessages((prev) => {
          const withoutOld = prev.filter((m) => m.role !== "system" || m.text === t("welcome"));
          return [...withoutOld, { id: newId(), role: "system", text: msg }];
        });
      })
      .catch(() => setStatusMessage(t("notConnected")));
  }, [open, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    focusFirstElement(panelRef.current);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, open]);

  if (!open) return null;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", text },
      { id: newId(), role: "system", text: statusMessage },
    ]);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn(
        "flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-2xl",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[#25D366] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <WhatsAppIcon className="h-6 w-6" />
          <div>
            <h2 id={titleId} className="text-sm font-bold">
              {t("title")}
            </h2>
            <p className="text-xs text-white/90">{t("subtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="rounded-md px-2 py-1 text-sm hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          ✕
        </button>
      </header>

      <div
        className="flex max-h-72 min-h-48 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              msg.role === "user"
                ? "ms-auto bg-[var(--accent)] text-white"
                : "me-auto bg-[var(--muted)] text-[var(--foreground)]",
            )}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t border-[var(--border)] p-3">
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor={`${panelId}-input`}>
            {t("inputLabel")}
          </label>
          <textarea
            id={`${panelId}-input`}
            ref={inputRef}
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("inputPlaceholder")}
            className="min-h-[2.5rem] flex-1 resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
          <Button type="button" size="sm" onClick={send} disabled={!draft.trim()} aria-label={t("send")}>
            {t("send")}
          </Button>
        </div>
      </footer>
    </div>
  );
}
