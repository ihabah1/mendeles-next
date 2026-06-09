/**
 * Pixel coordinates for marks on public/images/pais-lotto-form.png (244×670).
 * Calibrated by scanning oval interiors; Y varies per table band.
 */
export const PAIS_FORM_IMAGE = "/images/pais-lotto-form.png";
export const PAIS_FORM_WIDTH = 244;
export const PAIS_FORM_HEIGHT = 670;

/** Official PAIS form rows — 7 + 10 + 10 + 10 cells. */
export const PAIS_ROWS: readonly (readonly number[])[] = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  [28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
] as const;

export const PAIS_STRONG = [1, 2, 3, 4, 5, 6, 7] as const;

const NUM_ROW: Record<number, number> = {
  1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
  8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1,
  18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2, 25: 2, 26: 2, 27: 2,
  28: 3, 29: 3, 30: 3, 31: 3, 32: 3, 33: 3, 34: 3, 35: 3, 36: 3, 37: 3,
};

/** X center (px) per number — shared across all 14 tables. */
const NUM_X: Record<number, number> = {
  1: 28, 2: 43, 3: 58, 4: 76, 5: 93, 6: 110, 7: 127,
  8: 38, 9: 59, 10: 74, 11: 91, 12: 110, 13: 127, 14: 142, 15: 159, 16: 176, 17: 189,
  18: 34, 19: 51, 20: 68, 21: 85, 22: 101, 23: 118, 24: 135, 25: 152, 26: 169, 27: 186,
  28: 26, 29: 42, 30: 59, 31: 76, 32: 93, 33: 109, 34: 127, 35: 143, 36: 160, 37: 177,
};

const STRONG_X: Record<number, number> = {
  1: 199, 2: 203, 3: 191, 4: 207, 5: 203, 6: 210, 7: 211,
};

/** Row Y center (px) for each of the 14 tables. */
const TABLE_ROW_Y: readonly (readonly number[])[] = [
  [78, 84, 91, 97],
  [116, 123, 131, 138],
  [157, 163, 170, 176],
  [195, 202, 209, 216],
  [235, 242, 248, 255],
  [274, 281, 288, 295],
  [315, 323, 332, 340],
  [360, 366, 373, 379],
  [398, 405, 412, 419],
  [438, 445, 451, 458],
  [477, 484, 491, 498],
  [517, 523, 530, 536],
  [555, 562, 569, 576],
  [595, 601, 608, 614],
] as const;

const TABLE_STRONG_Y: readonly (readonly number[])[] = [
  [76, 80, 84, 88, 91, 95, 99],
  [115, 119, 123, 127, 131, 135, 139],
  [155, 159, 163, 167, 170, 174, 178],
  [194, 198, 202, 206, 210, 214, 218],
  [233, 237, 241, 245, 249, 253, 257],
  [273, 277, 281, 285, 289, 293, 297],
  [313, 318, 323, 328, 332, 337, 342],
  [358, 362, 366, 370, 373, 377, 381],
  [397, 401, 405, 409, 413, 417, 421],
  [436, 440, 444, 448, 452, 456, 460],
  [476, 480, 484, 488, 492, 496, 500],
  [515, 519, 523, 527, 530, 534, 538],
  [554, 558, 562, 566, 570, 574, 578],
  [593, 597, 601, 605, 608, 612, 616],
] as const;

export interface MarkPoint {
  x: number;
  y: number;
}

export const MARK_WIDTH = 18;
export const MARK_HEIGHT = 3;

function tableIndex(setIndex: number): number | null {
  if (setIndex < 1 || setIndex > TABLE_ROW_Y.length) return null;
  return setIndex - 1;
}

export function markForMainNumber(setIndex: number, num: number): MarkPoint | null {
  const ti = tableIndex(setIndex);
  const row = NUM_ROW[num];
  const x = NUM_X[num];
  if (ti === null || row === undefined || x === undefined) return null;
  return { x, y: TABLE_ROW_Y[ti][row] };
}

export function markForStrongNumber(setIndex: number, strong: number): MarkPoint | null {
  const ti = tableIndex(setIndex);
  const x = STRONG_X[strong];
  if (ti === null || strong < 1 || strong > 7 || x === undefined) return null;
  return { x, y: TABLE_STRONG_Y[ti][strong - 1] };
}

export function marksForTable(
  setIndex: number,
  numbers: number[],
  strong: number,
): MarkPoint[] {
  const pts: MarkPoint[] = [];
  for (const n of numbers) {
    const p = markForMainNumber(setIndex, n);
    if (p) pts.push(p);
  }
  const sp = markForStrongNumber(setIndex, strong);
  if (sp) pts.push(sp);
  return pts;
}
