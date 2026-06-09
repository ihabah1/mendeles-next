/**
 * Coordinates for marking numbers on the scanned PAIS lotto form image.
 * Row layout matches the official form (not the interactive web grid).
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

/** Calibrated overlay (% of image width/height) for public/images/pais-lotto-form.png */
const LAYOUT = {
  tablesStartY: 10.6,
  tablesEndY: 87.8,
  tableCount: 14,
  gridLeftX: 15.2,
  gridRightX: 77.8,
  strongCenterX: 86.8,
  rowCenterY: [0.2, 0.4, 0.58, 0.76] as const,
  strongCenterY: [0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86] as const,
};

export interface MarkPoint {
  x: number;
  y: number;
}

function tableBand(setIndex: number) {
  const span = LAYOUT.tablesEndY - LAYOUT.tablesStartY;
  const h = span / LAYOUT.tableCount;
  const top = LAYOUT.tablesStartY + (setIndex - 1) * h;
  return { top, height: h };
}

function findNumberCell(num: number): { row: number; col: number } | null {
  for (let row = 0; row < PAIS_ROWS.length; row++) {
    const col = PAIS_ROWS[row].indexOf(num);
    if (col >= 0) return { row, col };
  }
  return null;
}

export function markForMainNumber(setIndex: number, num: number): MarkPoint | null {
  if (setIndex < 1 || setIndex > 14) return null;
  const cell = findNumberCell(num);
  if (!cell) return null;

  const { top, height } = tableBand(setIndex);
  const cols = PAIS_ROWS[cell.row].length;
  const y = top + LAYOUT.rowCenterY[cell.row] * height;
  const xSpan = LAYOUT.gridRightX - LAYOUT.gridLeftX;
  const x =
    cols === 1
      ? LAYOUT.gridLeftX + xSpan / 2
      : LAYOUT.gridLeftX + (cell.col / (cols - 1)) * xSpan;
  return { x, y };
}

export function markForStrongNumber(setIndex: number, strong: number): MarkPoint | null {
  if (setIndex < 1 || setIndex > 14 || strong < 1 || strong > 7) return null;
  const { top, height } = tableBand(setIndex);
  return {
    x: LAYOUT.strongCenterX,
    y: top + LAYOUT.strongCenterY[strong - 1] * height,
  };
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
