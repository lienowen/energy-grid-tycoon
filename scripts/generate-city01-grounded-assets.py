#!/usr/bin/env python3
"""Generate City-01 runtime district PNGs without altering source artwork.

The source product PNG remains immutable. This script adds only the runtime
integration layers required by the art specification: lower-footprint terrain
bleed, contact shadow and an authored access-road mouth.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "public/assets/city01/product/districts/district-residential-base.png"
DEFAULT_OUTPUT = ROOT / "public/assets/city01/product/districts/runtime/district-residential-grounded.png"


def clamp_byte(value: float) -> int:
    return max(0, min(255, round(value)))


def vertical_ground_mask(alpha: Image.Image) -> Image.Image:
    """Keep grounding effects near the district footprint, not tower roofs."""
    width, height = alpha.size
    gradient = Image.new("L", (width, height), 0)
    pixels = gradient.load()
    start = height * 0.48
    full = height * 0.84
    for y in range(height):
        factor = 0 if y <= start else 1 if y >= full else (y - start) / (full - start)
        value = clamp_byte(255 * factor)
        for x in range(width):
            pixels[x, y] = value
    return ImageChops.multiply(alpha, gradient)


def vertical_fade(size: tuple[int, int], hold_until: int, fade_until: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    pixels = mask.load()
    for y in range(height):
        if y <= hold_until:
            value = 255
        elif y >= fade_until:
            value = 0
        else:
            value = clamp_byte(255 * (fade_until - y) / max(1, fade_until - hold_until))
        for x in range(width):
            pixels[x, y] = value
    return mask


def shifted(mask: Image.Image, dx: int, dy: int) -> Image.Image:
    output = Image.new("L", mask.size, 0)
    output.paste(mask, (dx, dy))
    return output


def colorize(mask: Image.Image, color: tuple[int, int, int], opacity: float) -> Image.Image:
    layer = Image.new("RGBA", mask.size, (*color, 0))
    layer.putalpha(mask.point(lambda value: clamp_byte(value * opacity)))
    return layer


def cubic_points(
    start: tuple[float, float],
    control_a: tuple[float, float],
    control_b: tuple[float, float],
    end: tuple[float, float],
    samples: int = 36,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(samples + 1):
        t = index / samples
        inverse = 1 - t
        x = (
            inverse**3 * start[0]
            + 3 * inverse**2 * t * control_a[0]
            + 3 * inverse * t**2 * control_b[0]
            + t**3 * end[0]
        )
        y = (
            inverse**3 * start[1]
            + 3 * inverse**2 * t * control_a[1]
            + 3 * inverse * t**2 * control_b[1]
            + t**3 * end[1]
        )
        points.append((x, y))
    return points


def dashed_polyline(
    draw: ImageDraw.ImageDraw,
    points: Iterable[tuple[float, float]],
    fill: tuple[int, int, int, int],
    width: int,
    dash: float,
    gap: float,
) -> None:
    sequence = list(points)
    for start, end in zip(sequence, sequence[1:]):
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        length = (dx * dx + dy * dy) ** 0.5
        if length <= 0:
            continue
        cursor = 0.0
        while cursor < length:
            segment_end = min(length, cursor + dash)
            x1 = start[0] + dx * cursor / length
            y1 = start[1] + dy * cursor / length
            x2 = start[0] + dx * segment_end / length
            y2 = start[1] + dy * segment_end / length
            draw.line((x1, y1, x2, y2), fill=fill, width=width)
            cursor += dash + gap


def generate_residential(source_path: Path, output_path: Path) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    width, height = source.size
    if (width, height) != (1024, 768):
        raise ValueError(f"Residential source must be 1024x768, got {width}x{height}")

    alpha = source.getchannel("A")
    lower_alpha = vertical_ground_mask(alpha)

    canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))

    # A restrained terrain bridge remains close to the baked platform. The first
    # iteration used a broad ellipse and read as a separate island at game scale.
    terrain = Image.new("RGBA", source.size, (0, 0, 0, 0))
    terrain_draw = ImageDraw.Draw(terrain, "RGBA")
    terrain_draw.ellipse((214, 520, 810, 690), fill=(34, 70, 57, 15))
    terrain_draw.ellipse((282, 550, 742, 660), fill=(40, 78, 62, 10))
    terrain = terrain.filter(ImageFilter.GaussianBlur(16))
    canvas = Image.alpha_composite(canvas, terrain)

    # The road begins beneath the district's own front road. The source image
    # covers the upper segment, leaving a short, connected mouth outside the lot.
    road = Image.new("RGBA", source.size, (0, 0, 0, 0))
    road_draw = ImageDraw.Draw(road, "RGBA")
    route = cubic_points((512, 500), (518, 555), (506, 625), (488, 700))
    road_draw.line(route, fill=(5, 14, 17, 154), width=32, joint="curve")
    road_draw.line(route, fill=(49, 64, 67, 218), width=21, joint="curve")
    dashed_polyline(road_draw, route[8:], (215, 190, 105, 54), 2, 10, 9)
    road = road.filter(ImageFilter.GaussianBlur(1.1))
    road_alpha = ImageChops.multiply(road.getchannel("A"), vertical_fade(source.size, 628, 716))
    road.putalpha(road_alpha)
    canvas = Image.alpha_composite(canvas, road)

    # Expand only the lower silhouette so the platform colour bleeds into terrain
    # while roofs and upper building silhouettes stay crisp.
    expanded = lower_alpha.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(12))
    halo = colorize(shifted(expanded, 0, 6), (25, 58, 48), 0.18)
    canvas = Image.alpha_composite(canvas, halo)

    contact = lower_alpha.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(7))
    shadow = colorize(shifted(contact, 0, 5), (2, 8, 10), 0.22)
    canvas = Image.alpha_composite(canvas, shadow)

    canvas = Image.alpha_composite(canvas, source)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, format="PNG", optimize=True)

    result_alpha = canvas.getchannel("A")
    border_width = 4
    border = Image.new("L", source.size, 0)
    border_draw = ImageDraw.Draw(border)
    border_draw.rectangle((0, 0, width - 1, height - 1), outline=255, width=border_width)
    opaque_border = ImageChops.multiply(result_alpha.point(lambda value: 255 if value > 16 else 0), border)
    border_opaque_pixels = sum(1 for value in opaque_border.getdata() if value > 0)
    border_pixels = sum(1 for value in border.getdata() if value > 0)

    return {
        "source": str(source_path.relative_to(ROOT)),
        "output": str(output_path.relative_to(ROOT)) if output_path.is_relative_to(ROOT) else str(output_path),
        "size": [width, height],
        "source_alpha_bbox": alpha.getbbox(),
        "output_alpha_bbox": result_alpha.getbbox(),
        "border_opaque_ratio": border_opaque_pixels / max(1, border_pixels),
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
