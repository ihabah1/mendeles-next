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


def interior(im, x: int, y: int) -> bool:
    r, g, b = im.getpixel((x, y))
    return r > 235 and g > 200


def scan_row(im, y: int, x0: int = 22, x1: int = 196) -> list[int]:
    runs: list[int] = []
    x = x0
    while x < x1:
        if interior(im, x, y):
            x0r = x
            while x < x1 and interior(im, x, y):
                x += 1
            if x - x0r > 5:
                runs.append((x0r + x) // 2)
            x += 1
        x += 1
    return runs


def table_headers(im) -> list[int]:
    w, h = im.size
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


def best_row_scan(im, t0: int, band: int, row_index: int) -> tuple[int, list[int]]:
    expect = 7 if row_index == 0 else 10
    base = t0 + 8 + int((row_index + 0.5) * (band - 12) / 4)
    best_y, best_c = base, []
    for y in range(base - 4, base + 5):
        centers = scan_row(im, y)[:expect]
        if len(centers) < expect:
            continue
        score = 10 - abs(y - base)
        prev = (10 - abs(best_y - base)) if len(best_c) == expect else -1
        if score > prev:
            best_y, best_c = y, centers
    return best_y, best_c


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
        strong_map: dict[str, list[int]] = {}

        for ri, nums in enumerate(ROWS):
            y, centers = best_row_scan(im, t0, band, ri)
            for num, cx in zip(nums, centers):
                row_map[str(num)] = [cx, y]

        for si, sn in enumerate(STRONG):
            base = t0 + 8 + int((si + 0.5) * (band - 12) / 7)
            best_y, best_x = base, None
            for y in range(base - 3, base + 4):
                hits = scan_row(im, y, 188, 218)
                if not hits:
                    continue
                if best_x is None or abs(y - base) < abs(best_y - base):
                    best_y, best_x = y, hits[0]
            if best_x is not None:
                strong_map[str(sn)] = [best_x, best_y]

        main.append(row_map)
        strong.append(strong_map)

    return {"w": w, "h": h, "main": main, "strong": strong}


def main() -> None:
    data = calibrate()
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT} ({len(data['main'])} tables)")


if __name__ == "__main__":
    main()
