#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/city01/product/districts/district-residential-base.png"
OUTPUT = ROOT / "public/assets/city01/product/districts/runtime/district-residential-integrated.png"


def vegetation_mask(source: Image.Image) -> Image.Image:
    mask = Image.new("L", source.size, 0)
    target = mask.load()
    pixels = source.load()
    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 16 and green > 55 and green > red * 1.12 and green > blue * 1.05:
                target[x, y] = 255
    return mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2))


def integration_mask(source: Image.Image) -> Image.Image:
    if source.size != (1024, 768):
        raise ValueError(f"expected 1024x768 source, got {source.size}")
    structures = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(structures)
    draw.rounded_rectangle((225, 120, 435, 325), radius=24, fill=255)
    draw.rounded_rectangle((500, 120, 735, 325), radius=24, fill=255)
    draw.polygon([(512, 190), (800, 345), (512, 480), (224, 345)], fill=255)
    return ImageChops.lighter(structures, vegetation_mask(source)).filter(ImageFilter.GaussianBlur(3))


def generate(source_path: Path, output_path: Path) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    alpha = ImageChops.multiply(source.getchannel("A"), integration_mask(source))
    output = source.copy()
    output.putalpha(alpha)
    output = output.quantize(
        colors=256,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.FLOYDSTEINBERG,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_path, format="PNG", optimize=True)
    return {
        "source": str(source_path.relative_to(ROOT)),
        "output": str(output_path.relative_to(ROOT)),
        "size": list(source.size),
        "alpha_bbox": alpha.getbbox(),
        "palette_colors": 256,
        "removed": ["perimeter-road", "raised-curb", "corner-pads"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--diagnostics", type=Path)
    args = parser.parse_args()
    source = args.source if args.source.is_absolute() else ROOT / args.source
    output = args.output if args.output.is_absolute() else ROOT / args.output
    result = generate(source, output)
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    print(payload)
    if args.diagnostics:
        target = args.diagnostics if args.diagnostics.is_absolute() else ROOT / args.diagnostics
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
