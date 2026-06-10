/** Site navigation knowledge for the guide chat (Hebrew). */

export interface GuideLink {
  href: string;
  label: string;
}

export interface GuideTopic {
  keywords: string[];
  reply: string;
  links: GuideLink[];
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    keywords: ["לוטו", "טופס", "טפסים", "הגרלה", "מילוי"],
    reply: "בדף הלוטו בוחרים מספרים, ממלאים טבלאות ושולחים להגשה. צריך להיות מחובר עם יתרה בארנק.",
    links: [{ href: "/lotto", label: "🎱 דף לוטו" }],
  },
  {
    keywords: ["777", "שבע", "seven"],
    reply: "777 הוא משחק נוסף באתר — בחר מספרים ושלח כמו בלוטו.",
    links: [{ href: "/seven77", label: "🎰 דף 777" }],
  },
  {
    keywords: ["טוטו", "toto", "כדורגל"],
    reply: "טוטו זמין כשהאפשרות פעילה באתר. היכנסו לדף הטוטו מהתפריט.",
    links: [{ href: "/toto", label: "⚽ דף טוטו" }],
  },
  {
    keywords: ["הרשמה", "התחבר", "כניסה", "login", "חשבון", "אימייל"],
    reply: "להרשמה או כניסה — דף האימות. אחרי הרשמה יש לאמת אימייל.",
    links: [
      { href: "/auth", label: "🔑 כניסה / הרשמה" },
      { href: "/auth/verify-email", label: "✉️ אימות אימייל" },
    ],
  },
  {
    keywords: ["פרופיל", "פרטים", "סיסמה", "הגדרות"],
    reply: "בפרופיל אפשר לעדכן פרטים, לשנות סיסמה ולראות היסטוריה.",
    links: [
      { href: "/profile", label: "👤 פרופיל" },
      { href: "/profile/details", label: "📝 פרטים אישיים" },
      { href: "/profile/password", label: "🔒 שינוי סיסמה" },
    ],
  },
  {
    keywords: ["ארנק", "יתרה", "טעינה", "כסף", "תשלום", "הפקדה"],
    reply: "היתרה מוצגת בסרגל העליון. לטעינת ארנק היכנסו לפרופיל → טעינה.",
    links: [
      { href: "/profile/topup", label: "💳 טעינת ארנק" },
      { href: "/profile", label: "👤 פרופיל" },
    ],
  },
  {
    keywords: ["הזמנ", "רכיש", "היסטור", "טפסים שלי"],
    reply: "היסטוריית ההזמנות והטפסים נמצאת בפרופיל.",
    links: [{ href: "/profile/orders", label: "📋 היסטוריית רכישות" }],
  },
  {
    keywords: ["בית", "ראשי", "דף הבית", "home"],
    reply: "דף הבית מציג מידע על השירות וקישורים למשחקים.",
    links: [{ href: "/", label: "🏠 דף ראשי" }],
  },
  {
    keywords: ["אודות", "מנדלס", "מי אתם"],
    reply: "בדף אודות תמצאו מידע על השירות.",
    links: [{ href: "/about", label: "ℹ️ אודות" }],
  },
  {
    keywords: ["תנאי", "משפטי", "פרטיות"],
    reply: "תנאי השימוש מפורטים בדף הייעודי.",
    links: [{ href: "/terms", label: "📜 תנאי שימוש" }],
  },
  {
    keywords: ["נגישות"],
    reply: "הצהרת הנגישות של האתר.",
    links: [{ href: "/accessibility", label: "♿ נגישות" }],
  },
  {
    keywords: ["נציג", "תמיכה", "שירות לקוחות", "לדבר עם", "צור קשר", "עזרה אנושית"],
    reply: "אפשר לבקש נציג כאן בצ'אט — כתבו «רוצה נציג» ונעביר את הבקשה לצוות האתר.",
    links: [],
  },
  {
    keywords: ["ניהול", "אדמין", "admin", "צוות"],
    reply: "אזור הניהול לצוות — הזמנות, הדפסה, הרשאות ויתרות. נדרשת הרשאת צוות.",
    links: [{ href: "/admin", label: "⚙️ דשבורד ניהול" }],
  },
];

export const GUIDE_WELCOME = "איך ניתן לעזור?";

export const GUIDE_QUICK_PROMPTS = [
  "איך ממלאים לוטו?",
  "איך טוענים ארנק?",
  "רוצה לדבר עם נציג",
  "איפה הפרופיל?",
];

export function matchGuideLocally(message: string): { text: string; links: GuideLink[] } {
  const q = message.trim().toLowerCase();
  if (!q) {
    return {
      text: "כתבו שאלה — למשל «איפה הלוטו?» או «איך טוענים יתרה?»",
      links: [{ href: "/lotto", label: "🎱 לוטו" }, { href: "/profile", label: "👤 פרופיל" }],
    };
  }

  let best: GuideTopic | null = null;
  let bestScore = 0;
  for (const topic of GUIDE_TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }

  if (best && bestScore > 0) {
    return { text: best.reply, links: best.links };
  }

  return {
    text: "לא מצאתי התאמה מדויקת. נסו לשאול על: לוטו, 777, פרופיל, ארנק, הרשמה או ניהול.",
    links: [
      { href: "/lotto", label: "🎱 לוטו" },
      { href: "/profile", label: "👤 פרופיל" },
      { href: "/auth", label: "🔑 כניסה" },
    ],
  };
}
