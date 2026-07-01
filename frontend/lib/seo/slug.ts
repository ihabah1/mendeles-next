const HEBREW_MAP: Record<string, string> = {
  א: "",
  ב: "b",
  ג: "g",
  ד: "d",
  ה: "h",
  ו: "v",
  ז: "z",
  ח: "ch",
  ט: "t",
  י: "y",
  כ: "k",
  ך: "k",
  ל: "l",
  מ: "m",
  ם: "m",
  נ: "n",
  ן: "n",
  ס: "s",
  ע: "",
  פ: "p",
  ף: "p",
  צ: "ts",
  ץ: "ts",
  ק: "k",
  ר: "r",
  ש: "sh",
  ת: "t",
};

export function transliterateHebrew(text: string): string {
  return [...text].map((c) => HEBREW_MAP[c] ?? c).join("");
}

export function slugify(text: string, maxLength = 200): string {
  if (!text) return "";
  let value = transliterateHebrew(text.trim())
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (value.length > maxLength) value = value.slice(0, maxLength).replace(/-+$/, "");
  return value || "page";
}

export function ensureUniqueSlug(base: string, existing: string[]): string {
  let candidate = base;
  let counter = 2;
  while (existing.includes(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}
