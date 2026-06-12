/** יעדי חיפוש — דפי האתר הזמינים בדף החיפוש */

export type SearchTarget = {
  href: string;
  label: string;
  subtitle: string;
  code: string;
};

export const SEARCH_TARGETS: SearchTarget[] = [
  { href: "/", label: "דף ראשי", subtitle: "HO47", code: "HO47" },
  { href: "/lotto", label: "לוטו", subtitle: "בסיס המשחק המרכזי", code: "LT83" },
  { href: "/seven77", label: "777", subtitle: "משחק מזל מהיר", code: "S777" },
  { href: "/toto", label: "טוטו", subtitle: "ניתוח סטטיסטי", code: "TT29" },
  { href: "/promotions", label: "מבצעים", subtitle: "הטבות ומתנות", code: "PM33" },
  { href: "/about", label: "אודות", subtitle: "למה אנחנו", code: "AB16" },
  { href: "/terms", label: "תנאי שימוש", subtitle: "מידע משפטי", code: "TE52" },
  { href: "/auth", label: "כניסה / הרשמה", subtitle: "התחברות לאתר", code: "AU91" },
  { href: "/profile", label: "פרופיל", subtitle: "ניהול חשבון", code: "PR64" },
  { href: "/profile/details", label: "פרטים אישיים", subtitle: "עדכון פרטי משתמש", code: "PD81" },
  { href: "/profile/password", label: "שינוי סיסמה", subtitle: "ניהול אבטחה", code: "PW62" },
  { href: "/topup", label: "טעינת ארנק", subtitle: "הוסף קרדיט לחשבון", code: "TU77" },
  { href: "/profile/orders", label: "תוצאות", subtitle: "היסטוריית הזמנות", code: "OR71" },
  { href: "/profile/forms", label: "היסטוריית רכישות", subtitle: "טפסים וקבלות", code: "OR71" },
  { href: "/accessibility", label: "נגישות", subtitle: "תמיכה למשתמשים", code: "AC12" },
  { href: "/auth/verify-email", label: "אימות אימייל", subtitle: 'אימות כתובת דוא"ל', code: "AV52" },
  { href: "/auth/oauth", label: "OAuth", subtitle: "כניסה חיצונית", code: "AO38" },
  { href: "/hot-numbers", label: "Hot Numbers היסטוריים", subtitle: "סטטיסטיקת מספרים חמים", code: "HN01" },
  { href: "/search", label: "חיפוש", subtitle: "חיפוש דפים באתר", code: "SE21" },
];
