import type { PreviewForm, PreviewTable } from "@/components/admin/LottoFormPreview";
import type { OrderSet } from "@/lib/api/types";

function normalizeSetsForPreview(sets: OrderSet[]): PreviewTable[] {
  const sorted = [...sets].sort(
    (a, b) => (a.set_index ?? 0) - (b.set_index ?? 0),
  );
  const out: PreviewTable[] = [];

  for (const s of sorted) {
    let nums = s.nums;
    if (!nums || nums.length !== 6) {
      nums = [s.n1, s.n2, s.n3, s.n4, s.n5, s.n6].filter(
        (n): n is number => n != null,
      );
    }
    const numbers = nums.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
    const strong = Number(s.strong ?? 0);
    if (numbers.length !== 6 || Number.isNaN(strong)) continue;

    out.push({
      setIndex: s.set_index ?? out.length + 1,
      numbers,
      strong,
      display:
        s.display ||
        `${[...numbers].sort((a, b) => a - b).join(" ")} | ${strong}`,
    });
  }

  return out;
}

/** Split order tables into PAIS forms (14 tables per sheet), matching the backend. */
export function formsFromOrderSets(sets: OrderSet[]): PreviewForm[] {
  const tables = normalizeSetsForPreview(sets);
  const forms: PreviewForm[] = [];

  for (let i = 0; i < tables.length; i += 14) {
    forms.push({
      formIndex: forms.length + 1,
      tables: tables.slice(i, i + 14),
    });
  }

  return forms;
}
