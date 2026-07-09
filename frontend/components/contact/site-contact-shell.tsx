"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "@/lib/i18n/navigation";
import { ContactWidget } from "@/components/contact/contact-widget";
import { WhatsAppFab } from "@/components/contact/whatsapp-fab";
import { fetchPublicFeatures } from "@/lib/site/features";

export function SiteContactShell() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const features = useQuery({
    queryKey: ["public-features"],
    queryFn: fetchPublicFeatures,
    enabled: isHome,
    staleTime: 60_000,
  });

  if (!isHome) return null;
  if (features.isLoading || features.isError) return null;
  if (!features.data?.contact_widget_home) return null;

  const contact = features.data.contact;
  const hasWhatsApp = Boolean(contact.whatsappNumber);

  return (
    <>
      {hasWhatsApp && <WhatsAppFab contact={contact} />}
      <ContactWidget contact={contact} stacked={hasWhatsApp} />
    </>
  );
}
