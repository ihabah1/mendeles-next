"""Snap each cell coordinate in pais-form-cells.json to the true capsule center.

Local refinement: for every stored (x, y), find the surrounding white capsule
interior and recenter on its bounding box. Fixes per-cell drift without
re-deriving the global table structure.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "frontend/public/images/pais-lotto-form.png"
CELLS = ROOT / "frontend/lib/lotto/pais-form-cells.json"


def main() -> None:
    im = Image.open(IMAGE).convert("RGB")
    px = im.load()
    w, h = im.size

    def interior(x: int, y: int) -> bool:
        if not (0 <= x < w and 0 <= y < h):
            return False
        r, g, b = px[x, y]
        return r > 235 and g > 195 and b > 195

    def find_seed(x: int, y: int) -> tuple[int, int] | None:
        """Nearest interior pixel within a small spiral."""
        if interior(x, y):
            return x, y
        for radius in range(1, 9):
            for dx in range(-radius, radius + 1):
                for dy in (-radius, radius):
                    if interior(x + dx, y + dy):
                        return x + dx, y + dy
            for dy in range(-radius + 1, radius):
                for dx in (-radius, radius):
                    if interior(x + dx, y + dy):
                        return x + dx, y + dy
        return None

    def snap(x: int, y: int) -> tuple[int, int] | None:
        seed = find_seed(x, y)
        if seed is None:
            return None
        sx, sy = seed
        # Vertical extent through the seed column.
        y0 = sy
        while interior(sx, y0 - 1) and sy - y0 < 8:
            y0 -= 1
        y1 = sy
        while interior(sx, y1 + 1) and y1 - sy < 8:
            y1 += 1
        cy = (y0 + y1) // 2
        # Horizontal extent at the vertical midline.
        x0 = sx
        while interior(x0 - 1, cy) and sx - x0 < 14:
            x0 -= 1
        x1 = sx
        while interior(x1 + 1, cy) and x1 - sx < 14:
            x1 += 1
        cx = (x0 + x1) // 2
        return cx, cy

    data = json.loads(CELLS.read_text(encoding="utf-8"))
    fixed = 0
    missed = 0
    for group in ("main", "strong"):
        for table in data[group]:
            for key, (x, y) in table.items():
                snapped = snap(int(x), int(y))
                if snapped is None:
                    missed += 1
                    continue
                if snapped != (x, y):
                    fixed += 1
                table[key] = [snapped[0], snapped[1]]

    CELLS.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"snapped: {fixed} adjusted, {missed} not found")

    # Validate: every coordinate must now sit on capsule interior.
    bad = []
    for group in ("main", "strong"):
        for ti, table in enumerate(data[group]):
            for key, (x, y) in table.items():
                if not interior(int(x), int(y)):
                    bad.append((group, ti + 1, key, x, y))
    print(f"off-target after snap: {len(bad)}")
    for entry in bad[:20]:
        print("  ", entry)


if __name__ == "__main__":
    main()
