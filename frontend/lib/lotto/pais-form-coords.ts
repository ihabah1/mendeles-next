/**
 * Coordinates for marking numbers on the scanned PAIS lotto form image.
 * Calibrated from public/images/pais-lotto-form.png (244×670).
 * Row layout matches the official form (7 + 10 + 10 + 10 + strong column).
 */
export const PAIS_FORM_IMAGE = "/images/pais-lotto-form.png";

/** Official PAIS form rows — 7 + 10 + 10 + 10 cells. */
export const PAIS_ROWS: readonly (readonly number[])[] = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  [28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
] as const;

export const PAIS_STRONG = [1, 2, 3, 4, 5, 6, 7] as const;

/** Top edge (% of image height) for each of the 14 table bands. */
const TABLE_TOPS = [
  10.0, 15.672, 21.791, 27.463, 33.433, 39.254, 45.224, 52.09, 57.761, 63.731,
  69.552, 75.522, 81.194, 87.164,
] as const;

/** Height (% of image) for each table band (non-uniform on the scan). */
const TABLE_HEIGHTS = [
  5.672, 6.119, 5.672, 5.97, 5.821, 5.97, 6.866, 5.672, 5.97, 5.821, 5.97, 5.672,
  5.97, 5.373,
] as const;

/**
 * Cell center within a table band: x = % of image width, y = % down from table top.
 * Auto-detected from oval interiors on table 1.
 */
const CELL_IN_TABLE: Record<number | string, readonly [number, number]> = {
  1: [11.475, 28.947],
  2: [17.623, 28.947],
  3: [23.77, 28.947],
  4: [31.148, 28.947],
  5: [38.115, 28.947],
  6: [45.082, 28.947],
  7: [52.049, 28.947],
  8: [15.574, 44.737],
  9: [24.18, 44.737],
  10: [30.328, 44.737],
  11: [37.295, 44.737],
  12: [45.082, 44.737],
  13: [52.049, 44.737],
  14: [58.197, 44.737],
  15: [65.164, 44.737],
  16: [72.131, 44.737],
  17: [77.459, 44.737],
  18: [13.934, 63.158],
  19: [20.902, 63.158],
  20: [27.869, 63.158],
  21: [34.836, 63.158],
  22: [41.393, 63.158],
  23: [48.361, 63.158],
  24: [55.328, 63.158],
  25: [62.295, 63.158],
  26: [69.262, 63.158],
  27: [76.23, 63.158],
  28: [10.656, 78.947],
  29: [17.213, 78.947],
  30: [24.18, 78.947],
  31: [31.148, 78.947],
  32: [38.115, 78.947],
  33: [44.672, 78.947],
  34: [52.049, 78.947],
  35: [58.607, 78.947],
  36: [65.574, 78.947],
  37: [72.541, 78.947],
  s1: [81.557, 23.684],
  s2: [83.197, 34.211],
  s3: [81.557, 44.737],
  s4: [84.016, 55.263],
  s5: [83.197, 63.158],
  s6: [85.656, 73.684],
  s7: [86.475, 84.211],
};

export interface MarkPoint {
  x: number;
  y: number;
}

function tableGeometry(setIndex: number): { top: number; height: number } | null {
  if (setIndex < 1 || setIndex > TABLE_TOPS.length) return null;
  const i = setIndex - 1;
  return { top: TABLE_TOPS[i], height: TABLE_HEIGHTS[i] };
}

function pointInTable(
  setIndex: number,
  cell: readonly [number, number],
): MarkPoint | null {
  const geom = tableGeometry(setIndex);
  if (!geom) return null;
  const [x, yInTable] = cell;
  return { x, y: geom.top + (yInTable / 100) * geom.height };
}

export function markForMainNumber(setIndex: number, num: number): MarkPoint | null {
  const cell = CELL_IN_TABLE[num];
  if (!cell) return null;
  return pointInTable(setIndex, cell);
}

export function markForStrongNumber(setIndex: number, strong: number): MarkPoint | null {
  if (strong < 1 || strong > 7) return null;
  const cell = CELL_IN_TABLE[`s${strong}`];
  if (!cell) return null;
  return pointInTable(setIndex, cell);
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
