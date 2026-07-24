from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


renderer = 'src/presentation/pixi/ImmersivePixiWorld.ts'

replace_once(
    renderer,
    "const commercialFacilityWidth = (facility: FacilitySceneState): number => {\n",
    "const commercialInfillPalette = {\n"
    "  residential: { roof: 0x4b7d87, left: 0x315761, right: 0x274951, accent: 0x72cadd },\n"
    "  mixed: { roof: 0x526f7b, left: 0x374e58, right: 0x2d4149, accent: 0xf0cc72 },\n"
    "  service: { roof: 0x4f7b70, left: 0x345a52, right: 0x294a44, accent: 0x7fe0bf },\n"
    "  warehouse: { roof: 0x6a5a4e, left: 0x4a3f38, right: 0x3b332e, accent: 0xe1a06f }\n"
    "} as const;\n\n"
    "const commercialFacilityWidth = (facility: FacilitySceneState): number => {\n"
)

replace_once(
    renderer,
    "      this.drawEnvironment(state.environment ?? []);\n"
    "      this.drawAuthoredRoads(state.roads);\n"
    "      if (commercialLife) this.drawCommercialStreetLife(commercialLife);\n",
    "      this.drawEnvironment(state.environment ?? []);\n"
    "      this.drawAuthoredRoads(state.roads);\n"
    "      if (commercialLife) {\n"
    "        this.drawCommercialJunctions(commercialLife);\n"
    "        this.drawCommercialInfill(commercialLife, showDiagnostics);\n"
    "        this.drawCommercialStreetLife(commercialLife);\n"
    "      }\n"
)

methods = r'''  private drawCommercialJunctions(plan: CommercialCityLifePlan): void {
    const colors = {
      residential: 0x314a4d,
      core: 0x3a4b50,
      civic: 0x31564f,
      industrial: 0x4a4540
    } as const;
    for (const junction of plan.junctions) {
      const base = this.roundedDiamond(junction.point, junction.radius, junction.radius)
        .fill({ color: colors[junction.tone], alpha: 0.98 })
        .stroke({ color: 0xb5c2bd, alpha: 0.14, width: 1 });
      base.zIndex = this.depth(junction.point, -12);
      this.layerManager.layers.roads.addChild(base);

      const position = this.project({ ...junction.point, elevation: 0.02 });
      const markings = new Graphics()
        .moveTo(position.x - 13, position.y - 5)
        .lineTo(position.x - 5, position.y - 1.5)
        .moveTo(position.x + 13, position.y - 5)
        .lineTo(position.x + 5, position.y - 1.5)
        .moveTo(position.x - 13, position.y + 5)
        .lineTo(position.x - 5, position.y + 1.5)
        .moveTo(position.x + 13, position.y + 5)
        .lineTo(position.x + 5, position.y + 1.5)
        .stroke({ color: 0xe2d49d, alpha: 0.42, width: 2, cap: 'round' })
        .circle(position.x, position.y, junction.tone === 'core' ? 3.4 : 2.6)
        .fill({ color: junction.tone === 'core' ? 0x67d3df : 0xa7b6b1, alpha: 0.5 });
      markings.zIndex = this.depth(junction.point, 2);
      this.layerManager.layers.groundDecorations.addChild(markings);
    }
  }

  private drawCommercialInfill(plan: CommercialCityLifePlan, diagnostics: boolean): void {
    for (const block of plan.infill) {
      const elevation = block.point.elevation;
      const topElevation = elevation + block.height;
      const baseWest = this.project({ ...block.point, x: block.point.x - block.width * 0.5, elevation });
      const baseNorth = this.project({ ...block.point, z: block.point.z - block.depth * 0.5, elevation });
      const baseEast = this.project({ ...block.point, x: block.point.x + block.width * 0.5, elevation });
      const baseSouth = this.project({ ...block.point, z: block.point.z + block.depth * 0.5, elevation });
      const topWest = this.project({ ...block.point, x: block.point.x - block.width * 0.5, elevation: topElevation });
      const topNorth = this.project({ ...block.point, z: block.point.z - block.depth * 0.5, elevation: topElevation });
      const topEast = this.project({ ...block.point, x: block.point.x + block.width * 0.5, elevation: topElevation });
      const topSouth = this.project({ ...block.point, z: block.point.z + block.depth * 0.5, elevation: topElevation });
      const palette = commercialInfillPalette[block.tone];
      const roofColor = block.powered ? palette.roof : 0x293235;
      const leftColor = block.powered ? palette.left : 0x20292b;
      const rightColor = block.powered ? palette.right : 0x192225;
      const alpha = diagnostics ? 0.58 : 0.9;

      const shadow = this.roundedDiamond(
        { ...block.point, elevation: -0.08 },
        block.width * 0.72,
        block.depth * 0.72
      ).fill({ color: 0x020709, alpha: diagnostics ? 0.18 : 0.32 });
      shadow.zIndex = this.depth(block.point, -12);
      this.layerManager.layers.buildingShadows.addChild(shadow);

      const sides = new Graphics()
        .poly([
          topWest.x, topWest.y,
          topSouth.x, topSouth.y,
          baseSouth.x, baseSouth.y,
          baseWest.x, baseWest.y
        ])
        .fill({ color: leftColor, alpha })
        .poly([
          topSouth.x, topSouth.y,
          topEast.x, topEast.y,
          baseEast.x, baseEast.y,
          baseSouth.x, baseSouth.y
        ])
        .fill({ color: rightColor, alpha });
      sides.zIndex = this.depth(block.point, 2);
      this.layerManager.layers.buildings.addChild(sides);

      const roof = new Graphics()
        .poly([
          topWest.x, topWest.y,
          topNorth.x, topNorth.y,
          topEast.x, topEast.y,
          topSouth.x, topSouth.y
        ])
        .fill({ color: roofColor, alpha: diagnostics ? 0.62 : 0.96 })
        .stroke({ color: palette.accent, alpha: block.powered ? 0.18 : 0.05, width: 1 });
      roof.zIndex = this.depth(block.point, 4);
      this.layerManager.layers.buildings.addChild(roof);

      const topCenter = this.project({ ...block.point, elevation: topElevation + 0.08 });
      const details = new Container();
      details.position.set(topCenter.x, topCenter.y);
      details.zIndex = this.depth(block.point, 5);
      const windowColor = block.powered
        ? block.night ? 0xffd77f : palette.accent
        : 0x475359;
      const windows = new Graphics();
      const windowCount = block.tone === 'warehouse' ? 2 : 3;
      for (let index = 0; index < windowCount; index += 1) {
        windows
          .roundRect(-7 + index * 5, 5 + (index % 2) * 2, 2.4, 3.2, 0.8)
          .fill({ color: windowColor, alpha: block.powered ? block.night ? 0.9 : 0.42 : 0.2 });
      }
      if (block.tone === 'service' || block.tone === 'warehouse') {
        windows
          .roundRect(-4.5, -3, 9, 4, 1.2)
          .fill({ color: 0x26383d, alpha: 0.82 });
      } else {
        windows
          .circle(0, -2, 2.3)
          .fill({ color: palette.accent, alpha: block.powered ? 0.32 : 0.08 });
      }
      details.addChild(windows);
      details.alpha = diagnostics ? 0.54 : 1;
      this.layerManager.layers.buildings.addChild(details);
    }
  }

'''
replace_once(
    renderer,
    "  private drawCommercialStreetLife(plan: CommercialCityLifePlan): void {\n",
    methods + "  private drawCommercialStreetLife(plan: CommercialCityLifePlan): void {\n"
)

layout = 'src/presentation/layout/LevelSceneLayoutRegistry.ts'
replace_once(layout, "  focus: { x: 53, y: 48, elevation: 0 },\n", "  focus: { x: 54, y: 50, elevation: 0 },\n")
replace_once(layout, "    startZoom: 1.31,\n", "    startZoom: 1.34,\n")
replace_once(layout, "    startOffsetY: 12,\n", "    startOffsetY: -6,\n")

test = 'src/presentation/CitySceneMapper.test.ts'
replace_once(test, "    expect(scene.camera.startZoom).toBe(1.31);\n", "    expect(scene.camera.startZoom).toBe(1.34);\n")
replace_once(
    test,
    "    expect(scene.focus).toEqual(toScenePoint({ x: 53, y: 48, elevation: 0 }));\n",
    "    expect(scene.focus).toEqual(toScenePoint({ x: 54, y: 50, elevation: 0 }));\n"
)
