from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public' / 'assets' / 'commercial'


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + '\n', encoding='utf-8')


def svg_shell(body: str, *, width: int = 1024, height: int = 768) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" fill="none">
  <defs>
    <linearGradient id="ground" x1="240" y1="330" x2="760" y2="690" gradientUnits="userSpaceOnUse">
      <stop stop-color="#244C48"/>
      <stop offset="1" stop-color="#112825"/>
    </linearGradient>
    <linearGradient id="road" x1="300" y1="390" x2="720" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#3A4B50"/>
      <stop offset="1" stop-color="#1B292E"/>
    </linearGradient>
    <linearGradient id="cyanFace" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#2A7892"/>
      <stop offset="1" stop-color="#123845"/>
    </linearGradient>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="9" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
  </defs>
{body}
</svg>'''


def diamond(cx: float, cy: float, rx: float, ry: float, fill: str, stroke: str = 'none', opacity: float = 1) -> str:
    return f'<polygon points="{cx},{cy-ry} {cx+rx},{cy} {cx},{cy+ry} {cx-rx},{cy}" fill="{fill}" stroke="{stroke}" opacity="{opacity}"/>'


def iso_building(
    x: float,
    y: float,
    w: float,
    h: float,
    d: float,
    color: str,
    accent: str,
    blackout: bool,
    rows: int = 4,
    cols: int = 3,
    roof: str | None = None,
) -> str:
    top = roof or accent
    left = '#142C35' if not blackout else '#151C21'
    right = color if not blackout else '#20292E'
    window = '#8FEAFF' if not blackout else '#26333A'
    warm = '#FFD77A' if not blackout else '#352D29'
    parts = [
        f'<ellipse cx="{x}" cy="{y+d*0.65}" rx="{w*0.62}" ry="{d*0.48}" fill="#02080C" opacity="0.42" filter="url(#soft)"/>',
        f'<polygon points="{x-w/2},{y-h+d/2} {x},{y-h+d} {x},{y+d} {x-w/2},{y+d/2}" fill="{left}"/>',
        f'<polygon points="{x+w/2},{y-h+d/2} {x},{y-h+d} {x},{y+d} {x+w/2},{y+d/2}" fill="{right}"/>',
        f'<polygon points="{x},{y-h} {x+w/2},{y-h+d/2} {x},{y-h+d} {x-w/2},{y-h+d/2}" fill="{top}"/>',
    ]
    for row in range(rows):
        yy = y - h + d + 18 + row * max(15, (h - 34) / max(1, rows))
        for col in range(cols):
            offset = (col - (cols - 1) / 2) * min(19, w / max(2.5, cols))
            fill = warm if (row + col) % 4 == 0 else window
            parts.append(f'<rect x="{x+offset-5}" y="{yy}" width="10" height="7" rx="1.5" fill="{fill}" opacity="{0.92 if not blackout else 0.48}"/>')
    if blackout:
        parts.append(f'<circle cx="{x+w*0.28}" cy="{y-h+d*0.45}" r="4" fill="#FF5F72" filter="url(#glow)"/>')
    return '\n'.join(parts)


def tree(x: float, y: float, scale: float = 1) -> str:
    return f'''<g transform="translate({x} {y}) scale({scale})">
  <ellipse cx="0" cy="8" rx="17" ry="8" fill="#02090A" opacity="0.35"/>
  <rect x="-3" y="-12" width="6" height="25" rx="2" fill="#59402F"/>
  <circle cx="0" cy="-22" r="17" fill="#397B58"/>
  <circle cx="-10" cy="-17" r="11" fill="#4A9369"/>
  <circle cx="10" cy="-18" r="10" fill="#2E684B"/>
</g>'''


def lamp(x: float, y: float, blackout: bool) -> str:
    light = '#FFDD82' if not blackout else '#404B4F'
    return f'''<g transform="translate({x} {y})">
  <rect x="-2" y="-27" width="4" height="30" rx="2" fill="#6E8890"/>
  <circle cx="0" cy="-30" r="5" fill="{light}" opacity="0.95" {'filter="url(#glow)"' if not blackout else ''}/>
</g>'''


def district_svg(kind: str, blackout: bool) -> str:
    palettes = {
        'residential': ('#23596B', '#57C4D8', '#5CE1A3'),
        'commercial': ('#294C75', '#B06DFF', '#53D8FF'),
        'industrial': ('#5A493D', '#E99A55', '#FFCC68'),
        'public': ('#245F5D', '#6BE0C1', '#8CD7FF'),
        'old_town': ('#493B45', '#C8778C', '#FFB56C'),
    }
    color, accent, marker = palettes[kind]
    ground_fill = '#17201F' if blackout else 'url(#ground)'
    parts: list[str] = [
        '<ellipse cx="512" cy="650" rx="330" ry="78" fill="#02080B" opacity="0.52" filter="url(#soft)"/>',
        diamond(512, 535, 355, 178, ground_fill, '#3E8179' if not blackout else '#4B3438', 0.98),
        '<path d="M230 545L505 410L795 557" stroke="#0A1216" stroke-width="48" stroke-linecap="round" opacity="0.88"/>',
        '<path d="M230 545L505 410L795 557" stroke="url(#road)" stroke-width="34" stroke-linecap="round"/>',
        '<path d="M355 625L512 535L675 625" stroke="#26383D" stroke-width="24" stroke-linecap="round"/>',
    ]

    if kind == 'residential':
        buildings = [
            (330, 485, 100, 210, 54, color, accent, 5, 3),
            (470, 420, 120, 270, 62, '#27697F', accent, 6, 4),
            (635, 475, 105, 220, 54, '#24566C', accent, 5, 3),
            (390, 600, 105, 125, 50, '#315D69', '#70C8D7', 3, 3),
            (575, 600, 110, 135, 52, '#2F626C', '#6FD3C0', 3, 3),
        ]
        parts += [iso_building(x, y, w, h, d, c, a, blackout, r, co) for x, y, w, h, d, c, a, r, co in buildings]
        parts += [tree(505, 555, 1.2), tree(535, 565, 0.9), tree(470, 570, 0.85)]
        parts.append('<ellipse cx="510" cy="560" rx="78" ry="35" fill="#2D7453" opacity="0.86"/>')
    elif kind == 'commercial':
        buildings = [
            (355, 510, 125, 245, 60, color, accent, 6, 4),
            (505, 405, 145, 330, 68, '#305A88', '#C48CFF', 7, 4),
            (665, 500, 125, 255, 60, '#244F78', '#5FE3FF', 6, 4),
            (505, 615, 190, 105, 60, '#3B5362', '#FFCC73', 2, 5),
        ]
        parts += [iso_building(x, y, w, h, d, c, a, blackout, r, co) for x, y, w, h, d, c, a, r, co in buildings]
        parts.append(diamond(512, 560, 95, 45, '#264B5B', '#78E8FF', 0.86))
        parts.append(f'<circle cx="512" cy="542" r="13" fill="{marker if not blackout else "#4A2D35"}" filter="url(#glow)"/>')
    elif kind == 'industrial':
        buildings = [
            (350, 545, 180, 115, 68, color, accent, 2, 4),
            (560, 500, 200, 145, 72, '#654A36', '#F0A565', 3, 5),
            (690, 605, 145, 90, 58, '#4B4A46', '#DB8F55', 2, 4),
        ]
        parts += [iso_building(x, y, w, h, d, c, a, blackout, r, co) for x, y, w, h, d, c, a, r, co in buildings]
        for x in (420, 455):
            parts.append(f'<rect x="{x}" y="330" width="20" height="185" rx="6" fill="#5B6263"/><ellipse cx="{x+10}" cy="330" rx="10" ry="5" fill="#D58A4F"/>')
        for x in (710, 755):
            parts.append(f'<ellipse cx="{x}" cy="500" rx="43" ry="22" fill="#866344"/><rect x="{x-43}" y="500" width="86" height="78" fill="#4B4C49"/><ellipse cx="{x}" cy="578" rx="43" ry="22" fill="#373D3C"/>')
    elif kind == 'public':
        buildings = [
            (355, 510, 150, 175, 60, color, accent, 4, 4),
            (565, 465, 180, 205, 64, '#2D6D70', '#84E8D0', 4, 5),
            (690, 590, 125, 110, 52, '#375B67', '#8CD7FF', 2, 3),
        ]
        parts += [iso_building(x, y, w, h, d, c, a, blackout, r, co) for x, y, w, h, d, c, a, r, co in buildings]
        parts.append(diamond(485, 585, 92, 43, '#315F52', '#78DBBF', 0.9))
        parts.append('<circle cx="355" cy="360" r="18" fill="#F3FBFF"/><rect x="348" y="339" width="14" height="42" rx="3" fill="#FF6072"/><rect x="334" y="353" width="42" height="14" rx="3" fill="#FF6072"/>')
        parts += [tree(455, 570, 0.85), tree(515, 610, 0.9), tree(585, 585, 0.8)]
    else:
        buildings = [
            (300, 535, 105, 105, 48, color, accent, 3, 3),
            (420, 470, 105, 135, 48, '#59414B', '#D8899D', 3, 3),
            (535, 525, 110, 120, 48, '#4D3C45', '#C6788E', 3, 3),
            (650, 470, 100, 130, 46, '#584149', '#E0949F', 3, 3),
            (735, 580, 105, 100, 45, '#493941', '#C77A8B', 2, 3),
            (390, 620, 100, 92, 44, '#503D43', '#DB8B93', 2, 3),
        ]
        parts += [iso_building(x, y, w, h, d, c, a, blackout, r, co) for x, y, w, h, d, c, a, r, co in buildings]
        parts.append('<path d="M275 585L425 510L560 575L720 495" stroke="#6D4D45" stroke-width="14" stroke-linecap="round" opacity="0.85"/>')
        parts += [tree(520, 610, 0.7), tree(610, 575, 0.65)]

    for lx, ly in ((260, 575), (410, 655), (610, 650), (760, 580)):
        parts.append(lamp(lx, ly, blackout))
    if not blackout:
        parts.append(f'<path d="M250 545L505 420L782 557" stroke="{marker}" stroke-width="5" opacity="0.45" filter="url(#glow)"/>')
    else:
        parts.append('<path d="M250 545L505 420L782 557" stroke="#FF5F72" stroke-width="3" opacity="0.22"/>')
    return svg_shell('\n'.join(parts))


def facility_svg(kind: str, offline: bool) -> str:
    glow = '#55DEFF' if not offline else '#38464D'
    warm = '#FFD26C' if not offline else '#4B3D32'
    parts = [
        '<ellipse cx="512" cy="640" rx="260" ry="70" fill="#02080A" opacity="0.52" filter="url(#soft)"/>',
        diamond(512, 555, 300, 150, '#21463F' if not offline else '#182220', '#3E8179' if not offline else '#3A4545', 0.98),
    ]
    if kind == 'solar':
        for row in range(4):
            for col in range(6):
                x = 335 + col * 72 + row * 18
                y = 425 + row * 58 + col * 5
                parts.append(f'<polygon points="{x},{y} {x+58},{y+26} {x+23},{y+48} {x-35},{y+22}" fill="#176A8A" stroke="{glow}" stroke-width="3" opacity="{0.95 if not offline else 0.55}"/>')
                parts.append(f'<path d="M{x-8} {y+11}L{x+46} {y+35}" stroke="#8EDFFF" opacity="0.35"/>')
        parts.append(iso_building(650, 565, 115, 95, 46, '#245D67', '#64D9E8', offline, 2, 3))
    elif kind == 'wind':
        for x, y, s in ((360, 545, 1.0), (515, 470, 1.2), (670, 555, 0.95)):
            parts.append(f'<g transform="translate({x} {y}) scale({s})"><rect x="-7" y="-180" width="14" height="190" rx="7" fill="#C8E4E8" opacity="{0.95 if not offline else 0.55}"/><circle cx="0" cy="-180" r="14" fill="{glow}"/><path d="M0 -180L0 -285M0 -180L91 -127M0 -180L-91 -127" stroke="#E5F7F8" stroke-width="10" stroke-linecap="round" opacity="{0.98 if not offline else 0.5}"/></g>')
    elif kind == 'gas':
        parts.append(iso_building(455, 545, 220, 145, 72, '#5A4A3E', '#F0A45E', offline, 3, 5))
        parts.append(iso_building(650, 575, 145, 105, 58, '#3E5152', '#E3A05E', offline, 2, 4))
        for x in (360, 405, 725):
            parts.append(f'<rect x="{x}" y="300" width="24" height="240" rx="8" fill="#697274"/><ellipse cx="{x+12}" cy="300" rx="12" ry="6" fill="{warm}"/>')
    elif kind == 'battery':
        for row in range(3):
            for col in range(4):
                x = 330 + col * 115 + row * 24
                y = 430 + row * 70 + col * 8
                parts.append(iso_building(x, y, 92, 70, 42, '#265B69', '#68D8EB', offline, 1, 3))
                parts.append(f'<rect x="{x-31}" y="{y-53}" width="62" height="8" rx="4" fill="{glow}" opacity="0.85"/>')
        parts.append(iso_building(690, 570, 135, 100, 50, '#2C5964', '#7CE8CF', offline, 2, 4))
    else:
        for x in (360, 520, 680):
            parts.append(f'<g transform="translate({x} 520)"><rect x="-42" y="-55" width="84" height="90" rx="9" fill="#315763"/><ellipse cx="0" cy="-55" rx="42" ry="18" fill="#6B97A0"/><path d="M-60 25L0 -10L60 25L0 60Z" fill="#233B43" stroke="{glow}" stroke-width="3"/><circle cx="0" cy="-8" r="12" fill="{warm}" filter="url(#glow)"/></g>')
        parts.append('<path d="M275 465L350 420L430 465M595 465L675 420L755 465" stroke="#A9C7CE" stroke-width="8" stroke-linecap="round"/>')
        parts.append('<path d="M350 420V285M675 420V285" stroke="#92B0B7" stroke-width="10"/><path d="M315 330H385M640 330H710" stroke="#92B0B7" stroke-width="8"/>')
    if not offline:
        parts.append(f'<ellipse cx="512" cy="535" rx="235" ry="112" stroke="{glow}" stroke-width="4" opacity="0.24" filter="url(#glow)"/>')
    return svg_shell('\n'.join(parts))


def shadow_svg(rx: int, ry: int) -> str:
    return svg_shell(f'<ellipse cx="512" cy="590" rx="{rx}" ry="{ry}" fill="#020609" opacity="0.58" filter="url(#soft)"/>')


entries: list[dict[str, object]] = []


def catalog_entry(asset_id: str, src: str, tags: Iterable[str]) -> None:
    entries.append({
        'id': asset_id,
        'kind': 'image',
        'src': src,
        'version': 6,
        'preload': 'level',
        'width': 1024,
        'height': 768,
        'anchor': {'x': 0.5, 'y': 0.86},
        'tags': ['global', 'commercial', 'v6', *tags],
    })


for kind in ('residential', 'commercial', 'industrial', 'public', 'old_town'):
    for state in ('night', 'blackout'):
        asset_id = f'commercial_district_{kind}_{state}'
        rel = f'/assets/commercial/districts/{kind}/{state}.svg'
        write(PUBLIC / 'districts' / kind / f'{state}.svg', district_svg(kind, state == 'blackout'))
        catalog_entry(asset_id, rel, ('district', kind, state))

write(PUBLIC / 'districts' / 'shadow.svg', shadow_svg(330, 72))
catalog_entry('commercial_district_shadow', '/assets/commercial/districts/shadow.svg', ('district', 'shadow'))

for kind in ('solar', 'wind', 'gas', 'battery', 'substation'):
    for state in ('active', 'offline'):
        asset_id = f'commercial_facility_{kind}_{state}'
        rel = f'/assets/commercial/facilities/{kind}/{state}.svg'
        write(PUBLIC / 'facilities' / kind / f'{state}.svg', facility_svg(kind, state == 'offline'))
        catalog_entry(asset_id, rel, ('facility', kind, state))

write(PUBLIC / 'facilities' / 'shadow.svg', shadow_svg(255, 62))
catalog_entry('commercial_facility_shadow', '/assets/commercial/facilities/shadow.svg', ('facility', 'shadow'))

catalog = {
    'schemaVersion': 6,
    'budgetBytes': 40_000_000,
    'entries': entries,
}
write(ROOT / 'src' / 'resources' / 'asset-catalog-commercial.json', json.dumps(catalog, ensure_ascii=False, indent=2))

replace_once(
    'src/resources/GlobalAssetCatalog.ts',
    "import v5CatalogData from './asset-catalog-v5.json';\n",
    "import v5CatalogData from './asset-catalog-v5.json';\nimport commercialCatalogData from './asset-catalog-commercial.json';\n"
)
replace_once(
    'src/resources/GlobalAssetCatalog.ts',
    "const v5Catalog = v5CatalogData as unknown as AssetCatalog;\n",
    "const v5Catalog = v5CatalogData as unknown as AssetCatalog;\nconst commercialCatalog = commercialCatalogData as unknown as AssetCatalog;\n"
)
replace_once(
    'src/resources/GlobalAssetCatalog.ts',
    "  schemaVersion: Math.max(legacyCatalog.schemaVersion, v5Catalog.schemaVersion),\n  budgetBytes: (legacyCatalog.budgetBytes ?? 0) + (v5Catalog.budgetBytes ?? 100_000_000),\n  entries: mergeEntries(legacyCatalog, v5Catalog)\n",
    "  schemaVersion: Math.max(legacyCatalog.schemaVersion, v5Catalog.schemaVersion, commercialCatalog.schemaVersion),\n"
    "  budgetBytes: (legacyCatalog.budgetBytes ?? 0)\n"
    "    + (v5Catalog.budgetBytes ?? 100_000_000)\n"
    "    + (commercialCatalog.budgetBytes ?? 40_000_000),\n"
    "  entries: mergeEntries(legacyCatalog, v5Catalog, commercialCatalog)\n"
)

replace_once(
    'src/presentation/CitySceneTypes.ts',
    "  variant: number;\n  powerRatio: number;\n",
    "  variant: number;\n  prefabAssetId?: string;\n  powerRatio: number;\n"
)
replace_once(
    'src/presentation/CitySceneMapper.ts',
    "const clamp = (value: number, min: number, max: number): number =>\n  Math.min(max, Math.max(min, value));\n",
    "const commercialDistrictAssetIds: Record<DistrictPrefabSceneState['kind'], string> = {\n"
    "  residential: 'commercial_district_residential',\n"
    "  commercial: 'commercial_district_commercial',\n"
    "  industrial: 'commercial_district_industrial',\n"
    "  public: 'commercial_district_public',\n"
    "  old_town: 'commercial_district_old_town'\n"
    "};\n\n"
    "const clamp = (value: number, min: number, max: number): number =>\n"
    "  Math.min(max, Math.max(min, value));\n"
)
replace_once(
    'src/presentation/CitySceneMapper.ts',
    "      variant: district.variant ?? rank,\n      powerRatio,\n",
    "      variant: district.variant ?? rank,\n      prefabAssetId: commercialDistrictAssetIds[district.kind],\n      powerRatio,\n"
)

replace_once(
    'src/presentation/visuals/FacilityVisualRegistry.ts',
    "  constructionProgress: number;\n",
    "  constructionProgress: number;\n  presentation?: 'standard' | 'commercial';\n"
)
replace_once(
    'src/presentation/visuals/FacilityVisualRegistry.ts',
    "const assetId = (family: FacilityVisualFamily, suffix: string): string =>\n  `world_facility_${family}_${suffix}`;\n",
    "const assetId = (family: FacilityVisualFamily, suffix: string): string =>\n"
    "  `world_facility_${family}_${suffix}`;\n\n"
    "const commercialFamilies = new Set<FacilityVisualFamily>(['solar', 'wind', 'gas', 'battery']);\n"
)
replace_once(
    'src/presentation/visuals/FacilityVisualRegistry.ts',
    "    const animated = input.enabled && state !== 'construction' && state !== 'offline';\n    return {\n",
    "    const animated = input.enabled && state !== 'construction' && state !== 'offline';\n"
    "    if (input.presentation === 'commercial' && commercialFamilies.has(family)) {\n"
    "      const commercialState = state === 'offline' ? 'offline' : 'active';\n"
    "      return {\n"
    "        family,\n"
    "        state,\n"
    "        bodyAssetId: `commercial_facility_${family}_${commercialState}`,\n"
    "        shadowAssetId: 'commercial_facility_shadow'\n"
    "      };\n"
    "    }\n"
    "    return {\n"
)

replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "    for (const node of state.networkNodes ?? []) {\n      this.drawNetworkNode(node, generation, showDiagnostics);\n    }\n",
    "    for (const node of state.networkNodes ?? []) {\n"
    "      this.drawNetworkNode(node, generation, showDiagnostics, state.levelId === 'city-01');\n"
    "    }\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "    generation: number,\n    showDiagnostics: boolean\n  ): void {\n",
    "    generation: number,\n    showDiagnostics: boolean,\n    commercial: boolean\n  ): void {\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "      this.addAssetObject({\n        assetId: `world_facility_${assetPrefix}_${stateSuffix}`,\n        point: { ...node, elevation: node.elevation + 0.65 },\n        width: node.kind === 'substation' ? 142 : 92,\n",
    "      const bodyAssetId = commercial && node.kind === 'substation'\n"
    "        ? `commercial_facility_substation_${node.status === 'offline' ? 'offline' : 'active'}`\n"
    "        : `world_facility_${assetPrefix}_${stateSuffix}`;\n"
    "      this.addAssetObject({\n"
    "        assetId: bodyAssetId,\n"
    "        point: { ...node, elevation: node.elevation + 0.65 },\n"
    "        width: commercial && node.kind === 'substation' ? 178 : node.kind === 'substation' ? 142 : 92,\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "    for (const district of state.districtPrefabs ?? []) {\n      const statusColor = districtStatusColor(district);\n      const ground = this.roundedDiamond(district, district.width * 0.5, district.depth * 0.5)\n",
    "    for (const district of state.districtPrefabs ?? []) {\n"
    "      const statusColor = districtStatusColor(district);\n"
    "      if (district.prefabAssetId) {\n"
    "        const suffix = district.status === 'blackout' || district.status === 'offline' ? 'blackout' : 'night';\n"
    "        const width = district.width * 13.2 * district.scale;\n"
    "        this.addAssetObject({\n"
    "          assetId: 'commercial_district_shadow',\n"
    "          point: { ...district, elevation: Math.max(-0.08, district.elevation - 0.28) },\n"
    "          width,\n"
    "          anchorY: 0.86,\n"
    "          generation,\n"
    "          layer: this.layerManager.layers.buildingShadows,\n"
    "          alpha: 0.68,\n"
    "          placeholderColor: 0x000000\n"
    "        });\n"
    "        this.addAssetObject({\n"
    "          assetId: `${district.prefabAssetId}_${suffix}`,\n"
    "          point: { ...district, elevation: district.elevation + 0.42 },\n"
    "          width,\n"
    "          anchorY: 0.86,\n"
    "          generation,\n"
    "          layer: this.layerManager.layers.buildings,\n"
    "          alpha: district.status === 'offline' ? 0.8 : 1,\n"
    "          placeholderColor: statusColor\n"
    "        });\n"
    "        if (shouldRenderDistrictLabel(district, showDiagnostics)) this.drawDistrictLabel(district);\n"
    "        continue;\n"
    "      }\n"
    "      const ground = this.roundedDiamond(district, district.width * 0.5, district.depth * 0.5)\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "        constructionProgress: 1\n      });\n",
    "        constructionProgress: 1,\n        presentation: authored ? 'commercial' : 'standard'\n      });\n"
)

print(f'Generated {len(entries)} commercial assets and wired the runtime prefab path.')
