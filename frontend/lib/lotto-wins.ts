/** Win rank calculation against published draw results. */

export const RANK_LABELS: Record<string, string> = {
  "6+strong": "6 + חזק 🏆",
  "6": "6 מספרים 🥇",
  "5+strong": "5 + חזק 🥈",
  "5": "5 מספרים 🥉",
  "4+strong": "4 + חזק",
  "4": "4 מספרים",
  "3+strong": "3 + חזק",
  "3": "3 מספרים",
};

export interface DrawResult {
  date: string;
  numbers: number[];
  strong: number;
  lottery_id?: number;
}

export interface LottoSetRow {
  set_index?: number;
  nums?: number[];
  n1?: number;
  n2?: number;
  n3?: number;
  n4?: number;
  n5?: number;
  n6?: number;
  strong?: number;
  display?: string;
}

export function normalizeSetNums(set: LottoSetRow): number[] | null {
  if (Array.isArray(set.nums) && set.nums.length === 6) {
    return set.nums.map(Number);
  }
  const keys = ["n1", "n2", "n3", "n4", "n5", "n6"] as const;
  if (keys.every((k) => set[k] != null)) {
    return keys.map((k) => Number(set[k]));
  }
  return null;
}

export function calcRank(
  nums: number[],
  strong: number,
  drawNums: number[],
  drawStrong: number,
): string | null {
  const hits = nums.filter((n) => drawNums.includes(n)).length;
  const strongHit = strong === drawStrong;
  if (hits === 6 && strongHit) return "6+strong";
  if (hits === 6) return "6";
  if (hits === 5 && strongHit) return "5+strong";
  if (hits === 5) return "5";
  if (hits === 4 && strongHit) return "4+strong";
  if (hits === 4) return "4";
  if (hits === 3 && strongHit) return "3+strong";
  if (hits === 3) return "3";
  return null;
}

export interface SetWinResult {
  setIndex: number;
  display: string;
  rank: string | null;
  hits: number;
  strongHit: boolean;
}

export interface OrderWinSummary {
  bestRank: string | null;
  winningSets: number;
  checked: boolean;
  drawDate: string | null;
  sets: SetWinResult[];
}

export function checkOrderWins(
  sets: LottoSetRow[],
  draw: DrawResult | null,
  prizes?: Record<string, { ils?: number }> | null,
): OrderWinSummary {
  const result: OrderWinSummary = {
    bestRank: null,
    winningSets: 0,
    checked: Boolean(draw),
    drawDate: draw?.date ?? null,
    sets: [],
  };
  if (!draw) return result;

  const rankOrder = ["6+strong", "6", "5+strong", "5", "4+strong", "4", "3+strong", "3"];

  sets.forEach((set, idx) => {
    const nums = normalizeSetNums(set);
    const strong = Number(set.strong ?? 0);
    if (!nums || !strong) return;

    const rank = calcRank(nums, strong, draw.numbers, draw.strong);
    const hits = nums.filter((n) => draw.numbers.includes(n)).length;
    const strongHit = strong === draw.strong;
    const display =
      set.display ||
      `${nums.join(" ")} | ${strong}`;

    result.sets.push({
      setIndex: set.set_index ?? idx + 1,
      display,
      rank,
      hits,
      strongHit,
    });

    if (rank) {
      result.winningSets += 1;
      if (!result.bestRank || rankOrder.indexOf(rank) < rankOrder.indexOf(result.bestRank)) {
        result.bestRank = rank;
      }
    }
  });

  void prizes;
  return result;
}

export function formatWinBadge(summary: OrderWinSummary): string {
  if (!summary.checked) return "בדיקת זכייה — אין נתוני הגרלה";
  if (summary.bestRank) {
    return RANK_LABELS[summary.bestRank] || summary.bestRank;
  }
  return "לא זכית בהגרלה האחרונה";
}
