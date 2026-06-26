import LandingNav from "@/components/landing/LandingNav";
import LandingPage from "@/components/landing/LandingPage";
import LandingComposerTeaser from "@/components/landing/LandingComposerTeaser";

export const metadata = {
  title: "מנדלס — מסמכים חכמים, חתימה דיגיטלית ו-AI לעסקים",
  description:
    "יצירת PDF עם לוגו, מילוי אוטומטי עם AI, שליחה לחתימה ומעקב סטטוס — לעסקים קטנים ובינוניים בישראל.",
};

export default function HomePage() {
  return (
    <div className="landing-page">
      <LandingNav />
      <main>
        <LandingPage />
        <LandingComposerTeaser />
      </main>
    </div>
  );
}
