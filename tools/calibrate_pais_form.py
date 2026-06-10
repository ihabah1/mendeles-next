"""Regenerate frontend/lib/lotto/pais-form-cells.json from the PAIS form scan."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "frontend/public/images/pais-lotto-form.png"
OUT = ROOT / "frontend/lib/lotto/pais-form-cells.json"

ROWS = [
    [1, 2, 3, 4, 5, 6, 7],
    list(range(8, 18)),
    list(range(18, 28)),
    list(range(28, 38)),
]
STRONG = list(range(1, 8))


def is_red(im, x: int, y: int) -> bool:
    r, g, b = im.getpixel((x, y))
    return r > 200 and g < 130 and b < 140


def is_interior(im, x: int, y: int) -> bool:
    r, g, b = im.getpixel((x, y))
    return r > 235 and g > 195 and b > 195


def red_edges(im, y: int, x0: int, x1: int) -> list[int]:
    edges: list[int] = []
    for x in range(x0, x1):
        if is_red(im, x, y):
            if not edges or x - edges[-1] > 1:
                edges.append(x)
    merged = [edges[0]] if edges else []
    for e in edges[1:]:
        if e - merged[-1] <= 2:
            merged[-1] = (merged[-1] + e) // 2
        else:
            merged.append(e)
    return merged


def centers_from_red_pairs(
    im,
    y: int,
    *,
    x0: int = 24,
    x1: int = 198,
    min_w: int = 6,
    max_w: int = 22,
) -> list[int]:
    edges = red_edges(im, y, x0, x1)
    centers: list[int] = []
    i = 0
    while i + 1 < len(edges):
        w = edges[i + 1] - edges[i]
        if min_w <= w <= max_w:
            centers.append((edges[i] + edges[i + 1]) // 2)
            i += 2
        else:
            i += 1
    return centers


def centers_from_interior_runs(
    im,
    y: int,
    *,
    x0: int = 24,
    x1: int = 198,
    min_w: int = 8,
) -> list[int]:
    runs: list[int] = []
    x = x0
    while x < x1:
        if is_interior(im, x, y):
            x0r = x
            while x < x1 and is_interior(im, x, y):
                x += 1
            if x - x0r >= min_w:
                runs.append((x0r + x) // 2)
            x += 1
        x += 1
    return runs


def spacing_score(centers: list[int]) -> float:
    if len(centers) < 2:
        return 0.0
    gaps = [centers[i + 1] - centers[i] for i in range(len(centers) - 1)]
    if not gaps:
        return 0.0
    avg = sum(gaps) / len(gaps)
    return -sum(abs(g - avg) for g in gaps)


def pick_centers(
    im,
    y: int,
    expect: int,
    *,
    mode: str,
) -> list[int] | None:
    if mode == "ten":
        centers = centers_from_red_pairs(im, y)
    else:
        centers = centers_from_interior_runs(im, y, min_w=10)

    if len(centers) < expect:
        return None

    if len(centers) > expect:
        if mode == "seven":
            # Row 1 (numbers 1–7) is the leftmost block on the sheet.
            first = centers[:expect]
            if spacing_score(first) > -80:
                return first
        # 10-cell rows: pick the most uniform window.
        best: list[int] | None = None
        best_score = float("-inf")
        for start in range(0, len(centers) - expect + 1):
            window = centers[start : start + expect]
            score = spacing_score(window)
            if score > best_score:
                best_score = score
                best = window
        return best

    return centers


def best_row_y(
    im,
    t0: int,
    band: int,
    row_index: int,
    expect: int,
) -> tuple[int, list[int]] | None:
    mode = "seven" if expect == 7 else "ten"
    base = t0 + 8 + int((row_index + 0.5) * (band - 12) / 4)
    best: tuple[int, list[int]] | None = None
    best_score = float("-inf")

    for y in range(base - 7, base + 8):
        centers = pick_centers(im, y, expect, mode=mode)
        if not centers or len(centers) != expect:
            continue
        score = spacing_score(centers) - abs(y - base) * 0.25
        if score > best_score:
            best_score = score
            best = (y, centers)

    return best


def table_headers(im) -> list[int]:
    _w, h = im.size
    headers: list[int] = []
    for y in range(40, h - 60):
        cnt = sum(
            1
            for x in range(22, 185)
            if im.getpixel((x, y))[0] > 200 and im.getpixel((x, y))[1] < 80
        )
        if cnt > 40:
            if not headers or y - headers[-1] > 25:
                headers.append(y)
    return headers


def calibrate_strong(im, t0: int, band: int) -> dict[str, list[int]]:
    hits: list[tuple[int, int]] = []
    for si, _sn in enumerate(STRONG):
        base = t0 + 8 + int((si + 0.5) * (band - 12) / 7)
        best: tuple[int, int] | None = None
        for y in range(base - 4, base + 5):
            centers = centers_from_red_pairs(im, y, x0=186, x1=220, min_w=4, max_w=18)
            if not centers:
                centers = centers_from_interior_runs(im, y, x0=186, x1=220, min_w=6)
            if not centers:
                continue
            cx = centers[len(centers) // 2]
            if best is None or abs(y - base) < abs(best[1] - base):
                best = (cx, y)
        if best:
            hits.append(best)

    if not hits:
        return {}

    xs = sorted(h[0] for h in hits)
    stable_x = xs[len(xs) // 2]
    strong_map: dict[str, list[int]] = {}
    for sn, (_cx, y) in zip(STRONG, hits):
        strong_map[str(sn)] = [stable_x, y]
    return strong_map


def calibrate() -> dict:
    im = Image.open(IMAGE).convert("RGB")
    w, h = im.size
    headers = table_headers(im)
    main: list[dict[str, list[int]]] = []
    strong: list[dict[str, list[int]]] = []

    for ti in range(14):
        t0 = headers[ti]
        t1 = headers[ti + 1] if ti + 1 < len(headers) else t0 + 38
        band = t1 - t0
        row_map: dict[str, list[int]] = {}

        # Prefer a shared 10-column grid from the middle rows for stability.
        grid10: list[int] | None = None
        for ri in (1, 2, 3):
            hit = best_row_y(im, t0, band, ri, 10)
            if hit and (grid10 is None or spacing_score(hit[1]) > spacing_score(grid10)):
                grid10 = hit[1]

        y7: int | None = None
        hit7 = best_row_y(im, t0, band, 0, 7)
        if hit7:
            y7 = hit7[0]

        for ri, nums in enumerate(ROWS):
            expect = 7 if ri == 0 else 10
            if ri == 0 and grid10 and y7 is not None:
                centers = grid10[:7]
                y = y7
            else:
                hit = best_row_y(im, t0, band, ri, expect)
                if not hit and expect == 10 and grid10:
                    y_fallback = t0 + 8 + int((ri + 0.5) * (band - 12) / 4)
                    hit = (y_fallback, grid10)
                if not hit:
                    continue
                y, centers = hit
                if expect == 10 and grid10:
                    centers = grid10
            for num, cx in zip(nums, centers):
                row_map[str(num)] = [cx, y]

        main.append(row_map)
        strong.append(calibrate_strong(im, t0, band))

    return {"w": w, "h": h, "main": main, "strong": strong}


def main() -> None:
    data = calibrate()
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({len(data['main'])} tables)")


if __name__ == "__main__":
    main()
