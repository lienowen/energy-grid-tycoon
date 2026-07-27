#!/usr/bin/env python3
"""Build the City-01 residential runtime PNG from the immutable product source.

The product image is a complete square road block. For the authored city map we
retain its buildings, vegetation and internal streets, while removing the outer
perimeter road and raised curb so it reads as an open neighbourhood.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "public/assets/city01/product/districts/district-residential-base.png"
DEFAULT_OUTPUT = ROOT / "public/assets/city01/product/districts/runtime/district-residential-integrated.png"


def make_integration_mask(size: tuple[int, int]) -> Image.Image:
    width, height = size
    if size != (1024, 768):
        raise ValueError(f"Residential source must be 1024x768, got {width}x{height}")

    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)

    # Towers and their tree canopy extend above the road block and remain intact.
    draw.rectangle((0, 0, width, 270), fill=255)

    # Retain the populated neighbourhood core and internal streets. The tighter
    # diamond removes the full perimeter road, thin raised curb and corner pads.
    draw.polygon(
        [(512, 185), (790, 345), (512, 470), (234, 345)],
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(4))


def border_opaque_ratio(alpha: Image.Image, border_width: int = 4) -> float:
    width, height = alpha.size
    border = Image.new("L", alpha.size, 0)
    draw = ImageDraw.Draw(border)
    draw.rectangle((0, 0, width - 1, height - 1), outline=255, width=border_width)
    opaque = ImageChops.multiply(alpha.point(lambda value: 255 if value > 16 else 0), border)
    opaque_pixels = sum(1 for value in opaque.getdata() if value > 0)
    border_pixels = sum(1 for value in border.getdata() if value > 0)
    return opaque_pixels / max(1, border_pixels)


def generate_residential(source_path: Path, output_path: Path) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    source_alpha = source.getchannel("A")
    integration_mask = make_integration_mask(source.size)
    output_alpha = ImageChops.multiply(source_alpha, integration_mask)

    output = source.copy()
    output.putalpha(output_alpha)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path, format="PNG", optimize=True)

    return {
        "source": str(source_path.relative_to(ROOT)),
        "output": str(output_path.relative_to(ROOT)) if output_path.is_relative_to(ROOT) else str(output_path),
        "size": list(source.size),
        "source_alpha_bbox": source_alpha.getbbox(),
        "output_alpha_bbox": output_alpha.getbbox(),
        "border_opaque_ratio": border_opaque_ratio(output_alpha),
        "integration": {
            "preserve_above_y": 270,
            "neighbourhood_core_polygon": [[512, 185], [790, 345], [512, 470], [234, 345]],
            "edge_feather_px": 4,
            "removed": ["perimeter-road", "raised-curb", "corner-pads"],
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--diagnostics", type=Path)
    args = parser.parse_args()

    source = args.source if args.source.is_absolute() else ROOT / args.source
    output = args.output if args.output.is_absolute() else ROOT / args.output
    diagnostics = generate_residential(source, output)
    payload = json.dumps(diagnostics, ensure_ascii=False, indent=2)
    print(payload)

    if args.diagnostics:
        diagnostics_path = args.diagnostics if args.diagnostics.is_absolute() else ROOT / args.diagnostics
        diagnostics_path.parent.mkdir(parents=True, exist_ok=True)
        diagnostics_path.write_text(payload + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
