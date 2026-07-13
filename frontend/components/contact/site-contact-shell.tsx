"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "@/lib/i18n/navigation";
import { ContactWidget } from "@/components/contact/contact-widget";
import { WhatsAppFab } from "@/components/contact/whatsapp-fab";
import { isMarketingPage } from "@/lib/contact/marketing-pages";
import { fetchPublicFeatures } from "@/lib/site/features";

/** WhatsApp chat FAB on all public marketing pages. */
export function WhatsAppChatShell() {
  const pathname = usePathname();
  if (!isMarketingPage(pathname)) return null;
  return <WhatsAppFab />;
}

/** Optional contact balloon on homepage (feature-flagged). */
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

  return <ContactWidget contact={features.data.contact} stacked />;
}
