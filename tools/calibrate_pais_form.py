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

ROW_FRACS = [0.26, 0.46, 0.64, 0.83]
STRONG_FRACS = [0.22, 0.32, 0.43, 0.53, 0.63, 0.73, 0.84]


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
            first = centers[:expect]
            if spacing_score(first) > -80:
                return first
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


def dedupe_hits(hits: list[tuple[int, list[int]]], min_gap: int = 4) -> list[tuple[int, list[int]]]:
    """Keep the best-spaced scan per Y cluster."""
    if not hits:
        return []
    hits = sorted(hits, key=lambda h: h[0])
    clusters: list[list[tuple[int, list[int]]]] = [[hits[0]]]
    for y, centers in hits[1:]:
        if y - clusters[-1][-1][0] < min_gap:
            clusters[-1].append((y, centers))
        else:
            clusters.append([(y, centers)])
    out: list[tuple[int, list[int]]] = []
    for cluster in clusters:
        best = max(cluster, key=lambda h: spacing_score(h[1]))
        out.append(best)
    return out


def collect_band_scans(
    im,
    t0: int,
    band: int,
) -> tuple[list[tuple[int, list[int]]], list[tuple[int, list[int]]]]:
    seven: list[tuple[int, list[int]]] = []
    ten: list[tuple[int, list[int]]] = []
    y_end = t0 + band - 2
    for y in range(t0 + 4, y_end):
        c7 = pick_centers(im, y, 7, mode="seven")
        if c7:
            seven.append((y, c7))
        c10 = pick_centers(im, y, 10, mode="ten")
        if c10:
            ten.append((y, c10))
    return dedupe_hits(seven), dedupe_hits(ten)


def nearest_hit(
    hits: list[tuple[int, list[int]]],
    target_y: int,
    used: set[int],
) -> tuple[int, list[int]] | None:
    best: tuple[int, list[int]] | None = None
    best_dist = float("inf")
    for y, centers in hits:
        if y in used:
            continue
        dist = abs(y - target_y)
        if dist < best_dist:
            best_dist = dist
            best = (y, centers)
    return best


def table_headers(im) -> list[int]:
    _w, h = im.size
    headers: list[int] = []
    for y in range(30, h - 40):
        cnt = sum(
            1
            for x in range(22, 185)
            if im.getpixel((x, y))[0] > 200 and im.getpixel((x, y))[1] < 80
        )
        if cnt > 20:
            if not headers or y - headers[-1] > 18:
                headers.append(y)
    # Logo band at top — keep the 14 table header rows only.
    while len(headers) > 14:
        headers.pop(0)
    if len(headers) < 14:
        raise RuntimeError(f"expected 14 table headers, found {len(headers)}: {headers}")
    return headers


def calibrate_strong(im, t0: int, band: int) -> dict[str, list[int]]:
    strong_map: dict[str, list[int]] = {}
    prev_y = t0

    for sn, frac in zip(STRONG, STRONG_FRACS):
        base = t0 + int(band * frac)
        base = max(base, prev_y + 2)
        best: tuple[int, int] | None = None

        for y in range(base - 4, base + 5):
            if y < prev_y + 2:
                continue
            centers = centers_from_red_pairs(
                im, y, x0=186, x1=220, min_w=4, max_w=18,
            )
            if not centers:
                centers = centers_from_interior_runs(
                    im, y, x0=188, x1=218, min_w=5,
                )
            if not centers:
                continue
            cx = int(sum(centers) / len(centers))
            if best is None or abs(y - base) < abs(best[1] - base):
                best = (cx, y)

        if best:
            strong_map[str(sn)] = [best[0], best[1]]
            prev_y = best[1]

    if strong_map:
        xs = sorted(v[0] for v in strong_map.values())
        stable_x = xs[len(xs) // 2]
        for key in strong_map:
            strong_map[key][0] = stable_x

    return strong_map


def calibrate_table(im, t0: int, band: int) -> dict[str, list[int]]:
    seven_hits, ten_hits = collect_band_scans(im, t0, band)
    row_map: dict[str, list[int]] = {}
    used_seven: set[int] = set()
    used_ten: set[int] = set()
    assigned_ten: list[tuple[int, list[int]]] = []
    row0_y: int | None = None

    for ri, nums in enumerate(ROWS):
        target_y = t0 + int(band * ROW_FRACS[ri])
        if ri == 0:
            hit = nearest_hit(seven_hits, target_y, used_seven)
            if hit:
                y, centers = hit
                used_seven.add(y)
            elif ten_hits:
                y, centers = ten_hits[0][0], ten_hits[0][1][:7]
            else:
                continue
            row0_y = y
        else:
            hit = nearest_hit(ten_hits, target_y, used_ten)
            if hit:
                y, centers = hit
                used_ten.add(y)
                assigned_ten.append((y, centers))
            elif ri == 1 and row0_y is not None and ten_hits:
                next_y, next_c = ten_hits[0]
                y = (row0_y + next_y) // 2
                centers = next_c
                assigned_ten.append((y, centers))
            elif assigned_ten:
                gaps = [assigned_ten[i + 1][0] - assigned_ten[i][0] for i in range(len(assigned_ten) - 1)]
                step = round(sum(gaps) / len(gaps)) if gaps else 8
                y = assigned_ten[-1][0] + max(step, 3)
                centers = assigned_ten[-1][1]
                assigned_ten.append((y, centers))
            elif ten_hits:
                y, centers = ten_hits[-1]
            else:
                continue

        for num, cx in zip(nums, centers):
            row_map[str(num)] = [cx, y]

    return row_map


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
        main.append(calibrate_table(im, t0, band))
        strong.append(calibrate_strong(im, t0, band))

    return {"w": w, "h": h, "main": main, "strong": strong}


def main() -> None:
    data = calibrate()
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({len(data['main'])} tables)")


if __name__ == "__main__":
    main()
