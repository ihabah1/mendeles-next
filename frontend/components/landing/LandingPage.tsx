import Link from "next/link";
import MandelesLogoMark from "@/components/promo/MandelesLogoMark";
import HeroDocumentVisual from "@/components/landing/HeroDocumentVisual";

const FEATURES = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "מאובטח",
    desc: "הצפנה ברמה גבוהה ושמירה על פרטיות",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "מעקב חכם",
    desc: "עדכונים בזמן אמת על סטטוס מסמכים",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 20h16M7 17l3-9 4 6 3-4 3 7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "חתימה דיגיטלית",
    desc: "תהליך חתימה פשוט, מהיר ומאובטח",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "PDF מקצועי",
    desc: "יצירת מסמכים עם לוגו ומרחב בהתאמה אישית",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2a7 7 0 0 1 7 7c0 2.5-1.2 4.5-3 5.8V18a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-3.2C6.2 13.5 5 11.5 5 9a7 7 0 0 1 7-7z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M9 21h6M10 9h.01M14 9h.01M9 13c.5.8 1.5 1.3 3 1.3s2.5-.5 3-1.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "AI אוטומטי",
    desc: "מילוי אוטומטי של מידע לחיסכון בזמן",
  },
] as const;

const TRUST_LOGOS = ["⬡", "◆", "▮", "○", "△"] as const;

export default function LandingPage() {
  return (
    <>
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="landing-hero-grid">
          <div className="landing-hero-content">
            <div className="landing-hero-brand">
              <MandelesLogoMark size="md" variant="club" theme="light" accent="gray" />
            </div>
            <h1 className="landing-hero-title">
              מסמכים חכמים, חתימה דיגיטלית ומעקב — הכל במקום אחד
            </h1>
            <p className="landing-hero-sub">
              יצירת PDF מקצועי בלוגו, מילוי אוטומטי עם AI, שליחה לחתימה ומעקב סטטוס — לעסקים
              קטנים ובינוניים בישראל.
            </p>
            <div className="landing-hero-cta">
              <Link href="/dashboard" className="landing-btn landing-btn--primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M3 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                לאזור המסמכים
              </Link>
              <Link href="/#create" className="landing-btn landing-btn--secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 8h8M8 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                התחל בחינם
              </Link>
            </div>
          </div>
          <HeroDocumentVisual />
        </div>
      </section>

      <section id="features" className="landing-features">
        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-trust">
        <p className="landing-trust-label">בני עסקים סומכים עלינו</p>
        <div className="landing-trust-logos">
          {TRUST_LOGOS.map((icon, i) => (
            <div key={i} className="landing-trust-logo">
              <span className="landing-trust-logo-icon" aria-hidden>
                {icon}
              </span>
              <span>COMPANY</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
