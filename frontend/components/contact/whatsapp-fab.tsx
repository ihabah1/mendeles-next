"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { WhatsAppIcon } from "@/components/contact/whatsapp-icon";
import { getContactSiteConfig, whatsappHref, type ContactSiteConfig } from "@/lib/contact/site-config";

type Props = {
  contact?: ContactSiteConfig;
};

export function WhatsAppFab({ contact: contactProp }: Props) {
  const t = useTranslations("contactWidget");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const envConfig = getContactSiteConfig();
  const number = envConfig.whatsappNumber || contactProp?.whatsappNumber || "";
  const message =
    envConfig.whatsappMessage || contactProp?.whatsappMessage || t("whatsappBotPrefill");
  const href = whatsappHref(number, message);

  if (!mounted || !href) return null;

  return createPortal(
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsappBotAria")}
      title={t("whatsappBotAria")}
      className="whatsapp-fab fixed bottom-4 end-4 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#20bd5a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
    >
      <WhatsAppIcon className="h-8 w-8" />
    </a>,
    document.body,
  );
}
