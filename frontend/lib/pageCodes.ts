/** מקרא דפים — 2 אותיות + מספר (מסונכרן עם backend/admin_panel/page_codes.py) */

export type PageCodeEntry = {
  code: string;
  labelHe: string;
  paths: string[];
};

const ENTRIES: PageCodeEntry[] = [
  { code: "HO47", labelHe: "דף ראשי", paths: ["/"] },
  { code: "LT83", labelHe: "לוטו", paths: ["/lotto"] },
  { code: "S777", labelHe: "777", paths: ["/seven77"] },
  { code: "TT29", labelHe: "טוטו", paths: ["/toto"] },
  { code: "AB16", labelHe: "אודות", paths: ["/about"] },
  { code: "TE52", labelHe: "תנאי שימוש", paths: ["/terms"] },
  { code: "AC12", labelHe: "נגישות", paths: ["/accessibility"] },
  { code: "AU91", labelHe: "כניסה / הרשמה", paths: ["/auth"] },
  { code: "AV52", labelHe: "אימות אימייל", paths: ["/auth/verify-email"] },
  { code: "AO38", labelHe: "OAuth", paths: ["/auth/oauth"] },
  { code: "PR64", labelHe: "פרופיל", paths: ["/profile"] },
  { code: "TU77", labelHe: "טעינת ארנק", paths: ["/topup"] },
  { code: "RP45", labelHe: "איפוס סיסמה", paths: ["/reset-password"] },
  { code: "AD33", labelHe: "ניהול Next.js", paths: ["/admin"] },
  { code: "AS88", labelHe: "שירותים (staff)", paths: ["/admin/services"] },
];

export function getPageCodeForPath(pathname: string | null): PageCodeEntry | null {
  const p = (pathname || "/").split("?")[0].replace(/\/$/, "") || "/";
  let best: PageCodeEntry | null = null;
  let bestLen = -1;
  for (const entry of ENTRIES) {
    for (const prefix of entry.paths) {
      const norm = prefix.replace(/\/$/, "") || "/";
      const match = p === norm || (norm !== "/" && p.startsWith(norm + "/"));
      if (match && norm.length > bestLen) {
        best = entry;
        bestLen = norm.length;
      }
    }
  }
  return best;
}

export function getPageCodeByCode(code: string): PageCodeEntry | undefined {
  return ENTRIES.find((e) => e.code === code.toUpperCase());
}
