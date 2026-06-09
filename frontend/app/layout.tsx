import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import PromoLayout from "@/components/promo/PromoLayout";

export const metadata: Metadata = {
  title: { template: "%s — Mandeles.co.il", default: "Mandeles.co.il — לוטו חכם" },
  description: "שירות מילוי טפסי לוטו מקצועי — 200 סטים, מילוי קל, הגשה אישית",
  keywords: ["לוטו", "מפעל הפיס", "טפסים", "200 סטים", "mandeles"],
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
        </AuthProvider>
        <footer style={{ textAlign: "center", padding: "20px 16px", borderTop: "1px solid var(--border)", color: "var(--muted)", fontSize: ".7rem", lineHeight: 1.8, background: "var(--bg2)" }}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <a href="/about" style={{ color: "var(--muted)", textDecoration: "none" }}>אודות</a>
            <a href="/terms" style={{ color: "var(--muted)", textDecoration: "none" }}>תנאי שימוש</a>
            <a href="/accessibility" style={{ color: "var(--muted)", textDecoration: "none" }}>נגישות</a>
          </div>
          © 2026 Mandeles.co.il | גיל מינימלי 18 | בעיות הימורים: <a href="tel:1800232425" style={{ color: "var(--gold)" }}>1-800-23-24-25</a>
        </footer>
      </body>
    </html>
  );
}
