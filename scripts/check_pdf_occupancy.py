"""Approximate rendered-page occupancy check for PDF QA.

Render pages with Poppler first, then run this script against the render
directory. It intentionally measures visible paper, borders and content
against the white page, so it catches artificial mostly-empty intermediate
pages without pretending to be a typesetting proof.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def occupancy(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGB")
    pixels = image.load()
    width, height = image.size
    total = width * height
    visible = 0
    ink = 0
    bounds: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            is_visible = min(red, green, blue) < 245 or max(red, green, blue) - min(red, green, blue) > 8
            if is_visible:
                visible += 1
                bounds.append((x, y))
            if min(red, green, blue) < 115:
                ink += 1

    return {
        "page": path.name,
        "contentFraction": round(visible / total, 3),
        "inkFraction": round(ink / total, 3),
        "bounds": (
            [min(x for x, _ in bounds), min(y for _, y in bounds), max(x for x, _ in bounds), max(y for _, y in bounds)]
            if bounds
            else None
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("render_dir", type=Path, help="Directory containing Poppler page-*.png files")
    parser.add_argument("--minimum", type=float, default=0.35, help="Minimum content fraction for intermediate pages")
    args = parser.parse_args()

    pages = sorted(args.render_dir.glob("page-*.png"))
    if not pages:
        raise SystemExit(f"No rendered pages found in {args.render_dir}")

    report = [occupancy(page) for page in pages]
    failures = [page for page in report[:-1] if float(page["contentFraction"]) < args.minimum]
    print(json.dumps({"pages": len(report), "minimum": args.minimum, "occupancy": report}, ensure_ascii=False))
    if failures:
        print(f"FAIL: {len(failures)} intermediate page(s) below {args.minimum:.0%}")
        return 1
    print("PASS: no intermediate page is artificially near-empty")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
