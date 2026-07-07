import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
