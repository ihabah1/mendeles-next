"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { WhatsAppChatWidget } from "@/components/contact/whatsapp-chat-widget";
import { WhatsAppIcon } from "@/components/contact/whatsapp-icon";
import { cn } from "@/lib/utils";

type Props = {
  stacked?: boolean;
};

export function WhatsAppFab({ stacked = false }: Props) {
  const t = useTranslations("whatsappChat");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "whatsapp-fab-root fixed end-4 z-[9999] flex flex-col items-end gap-3",
        stacked ? "bottom-20" : "bottom-4",
      )}
    >
      <WhatsAppChatWidget open={open} onClose={() => setOpen(false)} />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("fabAria")}
        title={t("fabTooltip")}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="whatsapp-fab flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#20bd5a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
      >
        <WhatsAppIcon className="h-8 w-8" />
      </button>
    </div>,
    document.body,
  );
}
