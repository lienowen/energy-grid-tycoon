from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


def update_object(path: str, object_id: str, updates: dict[str, str]) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    marker = f"id: '{object_id}'"
    start = text.index(marker)
    end = text.index('\n      }', start)
    block = text[start:end]
    for key, value in updates.items():
        pattern = rf"(\n\s+{re.escape(key)}: )[^,\n]+"
        block, count = re.subn(pattern, rf"\g<1>{value}", block, count=1)
        if count != 1:
            raise RuntimeError(f'{path}: could not update {object_id}.{key}')
    target.write_text(text[:start] + block + text[end:], encoding='utf-8')


renderer = 'src/presentation/pixi/ImmersivePixiWorld.ts'
replace_once(
    renderer,
    "  shouldRenderDistrictLabel,\n  shouldRenderNetworkEdge,\n",
    "  selectVisibleNetworkEdges,\n  shouldRenderDistrictLabel,\n  shouldRenderNetworkEdge,\n"
)
replace_once(
    renderer,
    "    for (const edge of state.networkEdges ?? []) {\n",
    "    for (const edge of selectVisibleNetworkEdges(state.networkEdges ?? [], showDiagnostics)) {\n"
)
replace_once(
    renderer,
    "const districtGroundColor: Record<DistrictPrefabSceneState['kind'], number> = {\n"
    "  residential: 0x25463f,\n"
    "  commercial: 0x263d4f,\n"
    "  industrial: 0x3c3a34,\n"
    "  public: 0x2b4a48,\n"
    "  old_town: 0x342e31\n"
    "};\n",
    "const districtGroundColor: Record<DistrictPrefabSceneState['kind'], number> = {\n"
    "  residential: 0x25463f,\n"
    "  commercial: 0x263d4f,\n"
    "  industrial: 0x3c3a34,\n"
    "  public: 0x2b4a48,\n"
    "  old_town: 0x342e31\n"
    "};\n\n"
    "const commercialDistrictRenderScale: Record<DistrictPrefabSceneState['kind'], number> = {\n"
    "  residential: 10.2,\n"
    "  commercial: 10.8,\n"
    "  industrial: 10.6,\n"
    "  public: 10.4,\n"
    "  old_town: 10.8\n"
    "};\n\n"
    "const commercialFacilityWidth = (facility: FacilitySceneState): number => {\n"
    "  const base = facility.configId.includes('solar')\n"
    "    ? 128\n"
    "    : facility.configId.includes('wind')\n"
    "      ? 184\n"
    "      : facility.configId.includes('gas')\n"
    "        ? 172\n"
    "        : facility.configId.includes('battery')\n"
    "          ? 158\n"
    "          : 174;\n"
    "  return base * facility.scale;\n"
    "};\n"
)
replace_once(
    renderer,
    "        width: commercial && node.kind === 'substation' ? 178 : node.kind === 'substation' ? 142 : 92,\n",
    "        width: commercial && node.kind === 'substation' ? 154 : node.kind === 'substation' ? 142 : 92,\n"
)
replace_once(
    renderer,
    "        const width = district.width * 13.2 * district.scale;\n",
    "        const width = district.width * commercialDistrictRenderScale[district.kind] * district.scale;\n"
)
replace_once(
    renderer,
    "      const visual = FacilityVisualRegistry.resolve({\n"
    "        configId: facility.configId,\n"
    "        category: facility.category,\n"
    "        enabled: facility.enabled,\n"
    "        selected: false,\n"
    "        constructionProgress: 1,\n"
    "        presentation: authored ? 'commercial' : 'standard'\n"
    "      });\n"
    "      this.addAssetObject({\n",
    "      const visual = FacilityVisualRegistry.resolve({\n"
    "        configId: facility.configId,\n"
    "        category: facility.category,\n"
    "        enabled: facility.enabled,\n"
    "        selected: false,\n"
    "        constructionProgress: 1,\n"
    "        presentation: authored ? 'commercial' : 'standard'\n"
    "      });\n"
    "      const bodyWidth = authored ? commercialFacilityWidth(facility) : 174 * facility.scale;\n"
    "      const shadowWidth = authored ? bodyWidth * 0.88 : 150 * facility.scale;\n"
    "      this.addAssetObject({\n"
)
replace_once(
    renderer,
    "        width: (authored ? 164 : 150) * facility.scale,\n",
    "        width: shadowWidth,\n"
)
replace_once(
    renderer,
    "        width: (authored ? 190 : 174) * facility.scale,\n",
    "        width: bodyWidth,\n"
)

renderer_path = ROOT / renderer
renderer_text = renderer_path.read_text(encoding='utf-8')
ridge_start = renderer_text.index('  private drawRidge(')
ridge_end = renderer_text.index('\n  private drawDistrictGround', ridge_start)
new_ridge = '''  private drawRidge(item: EnvironmentPrefabSceneState): void {
    const colors = [0x142724, 0x1b332e, 0x24443a];
    for (let layer = 0; layer < 3; layer += 1) {
      const point: ScenePoint = {
        x: item.x,
        z: item.z + layer * 2.2,
        elevation: 0.18 + layer * 0.12
      };
      const ridge = this.roundedDiamond(
        point,
        item.width * (0.48 - layer * 0.035),
        item.depth * (0.58 - layer * 0.06)
      )
        .fill({ color: colors[layer] ?? colors[0]!, alpha: 0.72 - layer * 0.08 })
        .stroke({ color: 0x52736c, alpha: 0.08, width: 1 });
      ridge.zIndex = this.depth(item, -80 + layer);
      this.layerManager.layers.terrain.addChild(ridge);
    }
  }
'''
renderer_path.write_text(renderer_text[:ridge_start] + new_ridge + renderer_text[ridge_end:], encoding='utf-8')

layout = 'src/presentation/layout/LevelSceneLayoutRegistry.ts'
replace_once(layout, "  focus: { x: 51, y: 46, elevation: 0 },\n", "  focus: { x: 53, y: 48, elevation: 0 },\n")
replace_once(layout, "    startZoom: 1.24,\n", "    startZoom: 1.31,\n")
replace_once(layout, "    startOffsetX: 18,\n    startOffsetY: 4,\n", "    startOffsetX: 8,\n    startOffsetY: 12,\n")

update_object(layout, 'dawn-residential', {'x': '49', 'y': '25', 'width': '22', 'depth': '15', 'scale': '0.88'})
update_object(layout, 'dawn-commercial', {'x': '40', 'y': '54', 'width': '23', 'depth': '17', 'scale': '0.9'})
update_object(layout, 'dawn-industrial', {'x': '70', 'y': '49', 'width': '23', 'depth': '17', 'scale': '0.9'})
update_object(layout, 'dawn-public', {'x': '54', 'y': '72', 'width': '20', 'depth': '14', 'scale': '0.88'})
update_object(layout, 'dawn-old-town', {'x': '84', 'y': '69', 'width': '20', 'depth': '15', 'scale': '0.9'})

replace_once(
    layout,
    "    { plotId: 'sunrise-neighborhood', x: 17, y: 25, elevation: 0.2, scale: 1.08 },\n"
    "    { plotId: 'south-outskirts', x: 24, y: 30, elevation: 0.2, scale: 1.04 },\n"
    "    { plotId: 'north-outskirts', x: 34, y: 13, elevation: 0.2, scale: 1 },\n"
    "    { plotId: 'east-coast', x: 76, y: 14, elevation: 0.45, scale: 1.15 },\n",
    "    { plotId: 'sunrise-neighborhood', x: 10, y: 23, elevation: 0.2, scale: 0.88 },\n"
    "    { plotId: 'south-outskirts', x: 22, y: 34, elevation: 0.2, scale: 0.88 },\n"
    "    { plotId: 'north-outskirts', x: 34, y: 13, elevation: 0.2, scale: 0.9 },\n"
    "    { plotId: 'east-coast', x: 82, y: 16, elevation: 0.45, scale: 1.02 },\n"
)
replace_once(
    layout,
    "    { plotId: 'west-industry', x: 18, y: 70, elevation: 0.15, scale: 1.16 },\n"
    "    { plotId: 'south-neighborhood', x: 37, y: 76, elevation: 0.12, scale: 1.02 },\n"
    "    { plotId: 'central-utility', x: 80, y: 30, elevation: 0.2, scale: 1.14 },\n",
    "    { plotId: 'west-industry', x: 17, y: 72, elevation: 0.15, scale: 1 },\n"
    "    { plotId: 'south-neighborhood', x: 36, y: 78, elevation: 0.12, scale: 0.94 },\n"
    "    { plotId: 'central-utility', x: 80, y: 32, elevation: 0.2, scale: 0.96 },\n"
)

update_object(layout, 'main-substation', {'x': '31', 'y': '49'})
update_object(layout, 'west-distribution', {'x': '49', 'y': '49'})
update_object(layout, 'east-distribution', {'x': '70', 'y': '50'})
update_object(layout, 'residential-load', {'x': '49', 'y': '25'})
update_object(layout, 'commercial-load', {'x': '40', 'y': '54'})
update_object(layout, 'industrial-load', {'x': '70', 'y': '49'})
update_object(layout, 'public-load', {'x': '54', 'y': '72'})
update_object(layout, 'old-town-load', {'x': '84', 'y': '69'})

print('Applied screenshot-driven commercial slice refinement.')
