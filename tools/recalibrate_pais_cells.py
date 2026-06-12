"""Rebuild pais-form-cells.json.

The form alternates "zebra" bands: some tables have white capsule interiors
on a pink band, others pink interiors on white background. A capsule is
detected as a 7x2 light block bounded by red outline on all four sides,
which works for both styles.

Capsule columns sit at fixed x positions (10 main + 2 strong). Table rows
are derived from the strong columns: the right strong column has a capsule
on every row (1,3,5,7), the left one only on rows 2-4 (2,4,6) — so a right
hit without a left hit marks row 1 of a table.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "frontend/public/images/pais-lotto-form.png"
OUT = ROOT / "frontend/lib/lotto/pais-form-cells.json"

MAIN_COLS = [33.5, 50.5, 66.5, 83.5, 100.5, 117.5, 134.5, 151.5, 168.5, 185.5]
STRONG_LEFT = 202.5
STRONG_RIGHT = 218.5
Y_MIN, Y_MAX = 58, 621


def main() -> None:
    im = Image.open(IMG).convert("RGB")
    w, h = im.size
    pix = im.load()

    def red(x: int, y: int) -> bool:
        if not (0 <= x < w and 0 <= y < h):
            return False
        r, g, _ = pix[x, y]
        return r - g >= 60

    def reddish(x: int, y: int) -> bool:
        """Looser threshold for anti-aliased outline pixels (pink bg is ~35)."""
        if not (0 <= x < w and 0 <= y < h):
            return False
        r, g, _ = pix[x, y]
        return r - g >= 45

    def light(x: int, y: int) -> bool:
        if not (0 <= x < w and 0 <= y < h):
            return False
        r, g, _ = pix[x, y]
        return r >= 240 and r - g <= 45

    def lightish(x: int, y: int) -> bool:
        """Interior or anti-aliased inner edge (smaller capsules have a
        1px-tall interior whose neighbors are blends)."""
        if not (0 <= x < w and 0 <= y < h):
            return False
        r, g, _ = pix[x, y]
        return r >= 235 and r - g <= 58

    def capsule_at(xi: int, y: int) -> bool:
        row_ok = all(light(xi + dx, y) for dx in range(-3, 4))
        if not row_ok:
            return False
        above = all(lightish(xi + dx, y - 1) for dx in range(-3, 4))
        below = all(lightish(xi + dx, y + 1) for dx in range(-3, 4))
        if not (above or below):
            return False
        side_l = any(red(xi - d, y + dy) for d in (4, 5, 6, 7, 8) for dy in (-1, 0, 1))
        side_r = any(red(xi + d, y + dy) for d in (4, 5, 6, 7, 8) for dy in (-1, 0, 1))
        top = any(reddish(xi + dx, y - d) for d in (1, 2, 3, 4, 5) for dx in (-1, 0, 1))
        bot = any(reddish(xi + dx, y + d) for d in (1, 2, 3, 4, 5) for dx in (-1, 0, 1))
        return side_l and side_r and top and bot

    def refine_x(xi: int, y: int) -> float:
        lx = xi
        while lx > xi - 9 and not red(lx, y):
            lx -= 1
        rx = xi
        while rx < xi + 9 and not red(rx, y):
            rx += 1
        return (lx + rx) / 2

    def column_centers(xc: float) -> list[tuple[float, float]]:
        """Detected capsules in a column as (y_center, x_center) pairs."""
        hits: list[tuple[int, int]] = []
        for y in range(Y_MIN, Y_MAX):
            for off in (0, -1, 1):
                xi = round(xc) + off
                if capsule_at(xi, y):
                    hits.append((y, xi))
                    break
        centers: list[tuple[float, float]] = []
        run: list[tuple[int, int]] = []
        for y, xi in hits:
            if run and y - run[-1][0] > 2:
                cy = sum(p[0] for p in run) / len(run)
                cx = sum(refine_x(p[1], p[0]) for p in run) / len(run)
                centers.append((cy, cx))
                run = []
            run.append((y, xi))
        if run:
            cy = sum(p[0] for p in run) / len(run)
            cx = sum(refine_x(p[1], p[0]) for p in run) / len(run)
            centers.append((cy, cx))
        return centers

    col_rows = {xc: column_centers(xc) for xc in MAIN_COLS}
    sl_rows = column_centers(STRONG_LEFT)
    sr_rows = column_centers(STRONG_RIGHT)

    for xc in MAIN_COLS:
        print(f"col x={xc}: {len(col_rows[xc])} capsules")
    print(f"strong left: {len(sl_rows)} (expect 42), strong right: {len(sr_rows)} (expect 56)")

    # keep only strong-right rows corroborated by enough main columns
    def support(y: float) -> int:
        return sum(
            1
            for xc in MAIN_COLS
            if any(abs(y - cy) <= 2.5 for cy, _ in col_rows[xc])
        )

    sr_rows = [r for r in sr_rows if support(r[0]) >= 5]
    sl_rows = [r for r in sl_rows if support(r[0]) >= 5]

    if len(sr_rows) != 56 or len(sl_rows) != 42:
        print("ERROR: strong column counts wrong after support filter", file=sys.stderr)
        for label, rows in (("SL", sl_rows), ("SR", sr_rows)):
            print(label, [round(r[0], 1) for r in rows], file=sys.stderr)
        sys.exit(1)

    sl_ys = [r[0] for r in sl_rows]

    def has_left(y: float) -> bool:
        return any(abs(y - sy) <= 2.5 for sy in sl_ys)

    # rows of each table: a right-strong hit with no left-strong hit = row 1
    tables_rows: list[list[float]] = []
    for cy, _cx in sr_rows:
        if not has_left(cy):
            tables_rows.append([cy])
        else:
            if not tables_rows:
                print("ERROR: row before first table", file=sys.stderr)
                sys.exit(1)
            tables_rows[-1].append(cy)

    if len(tables_rows) != 14 or any(len(t) != 4 for t in tables_rows):
        print(f"ERROR: table grouping failed: {[len(t) for t in tables_rows]}", file=sys.stderr)
        sys.exit(1)

    def nearest(vals: list[tuple[float, float]], target: float, tol: float = 3.5):
        best = min(vals, key=lambda v: abs(v[0] - target), default=None)
        if best is None or abs(best[0] - target) > tol:
            return None
        return best

    main_tables = []
    strong_tables = []
    warnings = []
    for ti, rows_y in enumerate(tables_rows):
        cells = {}
        num = 1
        for ri, ry in enumerate(rows_y):
            cols = MAIN_COLS[3:] if ri == 0 else MAIN_COLS
            for xc in cols:
                hit = nearest(col_rows[xc], ry)
                if hit is None:
                    warnings.append(f"table {ti+1}: cell {num} missing at col {xc} y~{ry:.1f}")
                    hit = (ry, xc)
                cells[str(num)] = [round(hit[1]), round(hit[0])]
                num += 1
        main_tables.append(cells)

        sc = {}
        for i, ry in enumerate(rows_y):  # right col: 1,3,5,7
            hit = nearest(sr_rows, ry)
            sc[str(1 + i * 2)] = [round(hit[1]), round(hit[0])]
        for i, ry in enumerate(rows_y[1:]):  # left col: 2,4,6
            hit = nearest(sl_rows, ry)
            if hit is None:
                warnings.append(f"table {ti+1}: strong {2+i*2} missing y~{ry:.1f}")
                hit = (ry, STRONG_LEFT)
            sc[str(2 + i * 2)] = [round(hit[1]), round(hit[0])]
        strong_tables.append(sc)

    if warnings:
        print(f"{len(warnings)} warnings:")
        for e in warnings[:40]:
            print(" ", e)

    data = {"w": w, "h": h, "main": main_tables, "strong": strong_tables}
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
