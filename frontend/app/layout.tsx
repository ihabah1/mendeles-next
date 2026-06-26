import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import PromoLayout from "@/components/promo/PromoLayout";
import SiteGuideChat from "@/components/SiteGuideChat";
import SiteMetricsPing from "@/components/SiteMetricsPing";
import CookieNotice from "@/components/CookieNotice";
import SiteFooter from "@/components/SiteFooter";
import AccessibilityWidget from "@/components/AccessibilityWidget";

export const metadata: Metadata = {
  title: { template: "%s — Mandeles.co.il", default: "מנדלס — מסמכים חכמים לעסקים" },
  description: "יצירת PDF עם לוגו, מילוי אוטומטי עם AI, שליחה לחתימה ומעקב סטטוס — לעסקים בישראל",
  keywords: ["מסמכים", "חתימה דיגיטלית", "הצעת מחיר", "PDF", "עסקים", "mandeles"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;900&family=Frank+Ruhl+Libre:wght@700;900&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        `}</style>
      </head>
      <body>
        <AuthProvider>
          <PromoLayout>{children}</PromoLayout>
          <SiteGuideChat />
          <SiteMetricsPing />
          <AccessibilityWidget />
          <CookieNotice />
        </AuthProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
