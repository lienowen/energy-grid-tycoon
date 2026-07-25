from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)

layout_path = Path('src/presentation/layout/LevelSceneLayoutRegistry.ts')
layout = layout_path.read_text()
layout = replace_once(layout, "      x: 40,\n      y: 54,\n      width: 23,\n      depth: 17,\n      scale: 0.9,", "      x: 34,\n      y: 50,\n      width: 21,\n      depth: 16,\n      scale: 0.78,", 'commercial district placement')
layout = replace_once(layout, "      x: 70,\n      y: 49,\n      width: 23,\n      depth: 17,\n      scale: 0.9,", "      x: 75,\n      y: 54,\n      width: 22,\n      depth: 16,\n      scale: 0.78,", 'industrial district placement')
layout = replace_once(layout, "        x: 43,\n        y: 48,\n        elevation: 0.15,", "        x: 56,\n        y: 45,\n        elevation: 0.15,", 'substation placement')
layout = replace_once(layout, "        x: 40,\n        y: 54,\n        elevation: 0.1,\n        districtId: 'dawn-commercial',", "        x: 34,\n        y: 50,\n        elevation: 0.1,\n        districtId: 'dawn-commercial',", 'commercial network load')
layout = replace_once(layout, "        x: 70,\n        y: 49,\n        elevation: 0.1,\n        districtId: 'dawn-industrial',", "        x: 75,\n        y: 54,\n        elevation: 0.1,\n        districtId: 'dawn-industrial',", 'industrial network load')
layout = layout.replace("{ x: 35, y: 42 }, { x: 43, y: 48 }", "{ x: 44, y: 43 }, { x: 56, y: 45 }")
layout = layout.replace("{ x: 34, y: 55 }, { x: 43, y: 48 }", "{ x: 43, y: 51 }, { x: 56, y: 45 }")
layout = layout.replace("points: [{ x: 43, y: 48 }, { x: 50, y: 47 }, { x: 57, y: 48 }]", "points: [{ x: 56, y: 45 }, { x: 56, y: 47 }, { x: 57, y: 48 }]")
layout_path.write_text(layout)

world_path = Path('src/presentation/pixi/ImmersivePixiWorld.ts')
world = world_path.read_text()
world = replace_once(world, "  commercial: 9.3,", "  commercial: 7.7,", 'commercial render scale')
world = replace_once(world, "  industrial: 9.1,", "  industrial: 7.8,", 'industrial render scale')
world = replace_once(world, "width: commercial && node.kind === 'substation' ? 208", "width: commercial && node.kind === 'substation' ? 182", 'substation width')
world_path.write_text(world)
