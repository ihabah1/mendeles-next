import type { Metadata } from "next";
import { getSiteUrl, isProductionRuntime, PRODUCTION_SITE_URL } from "@/lib/seo/site-url";
import "./globals.css";

const siteOrigin = isProductionRuntime() ? PRODUCTION_SITE_URL : getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
