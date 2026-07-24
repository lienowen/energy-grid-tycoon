from pathlib import Path

BRANCH_FILES = {
    'src/ui/MayorDashboard.ts': None,
    'src/ui/hologram-sandbox.css': None,
    'src/presentation/pixi/ImmersivePixiWorld.ts': None,
    'src/presentation/layout/LevelSceneLayoutRegistry.ts': None,
    'src/presentation/CitySceneMapper.test.ts': None,
}


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


def append_once(path: str, marker: str, content: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if content.strip() in text:
        return
    if marker not in text:
        raise RuntimeError(f'{path}: marker missing: {marker!r}')
    target.write_text(text.replace(marker, content + '\n\n' + marker, 1), encoding='utf-8')


mayor = 'src/ui/MayorDashboard.ts'
replace_once(
    mayor,
    "  private presentationMode: 'city' | 'grid' = 'city';\n",
    "  private presentationMode: 'city' | 'grid' = 'city';\n  private buildDockOpen = false;\n",
)
replace_once(
    mayor,
    "        <button data-presentation-toggle=\"true\" aria-pressed=\"${this.presentationMode === 'grid'}\" class=\"${this.presentationMode === 'grid' ? 'active' : ''}\" title=\"切换城市经营与电网诊断视图\"><i>⌁</i><span>${this.presentationMode === 'grid' ? '城市' : '电网'}</span></button>\n",
    "        <button data-presentation-toggle=\"true\" aria-pressed=\"${this.presentationMode === 'grid'}\" class=\"${this.presentationMode === 'grid' ? 'active' : ''}\" title=\"切换城市经营与电网诊断视图\"><i>⌁</i><span>${this.presentationMode === 'grid' ? '城市' : '电网'}</span></button>\n        <button data-build-dock-toggle=\"true\" aria-pressed=\"${this.buildDockOpen}\" class=\"${this.buildDockOpen ? 'active' : ''}\" title=\"打开建设设施\"><i>＋</i><span>建设</span></button>\n",
)
replace_once(
    mayor,
    "  private renderBuildDock(view: GameViewModel, counts: ReadonlyMap<string, number>): string {\n    const ended = view.state.completed || view.state.failed;\n    return `\n      <section class=\"hologram-build-dock\">\n        <header><strong>建设设施</strong><small>${this.selectedBuildingId ? '点击沙盘中发亮的位置' : '先选择一个项目'}</small></header>\n",
    "  private renderBuildDock(view: GameViewModel, counts: ReadonlyMap<string, number>): string {\n    if (!this.buildDockOpen) return '';\n    const ended = view.state.completed || view.state.failed;\n    return `\n      <section class=\"hologram-build-dock\">\n        <header><strong>建设设施</strong><small>选择项目后，在城市中确认位置</small><button data-build-dock-toggle=\"true\" aria-label=\"关闭建设栏\">×</button></header>\n",
)
replace_once(
    mayor,
    "  private openPanel(panel: MayorPanel): void {\n    this.activePanel = panel;\n    this.selectedBuildingId = undefined;\n",
    "  private openPanel(panel: MayorPanel): void {\n    this.activePanel = panel;\n    this.buildDockOpen = false;\n    this.selectedBuildingId = undefined;\n",
)
replace_once(
    mayor,
    "    this.focusedBuildingId = undefined;\n    this.selectedBuildingId = this.selectedBuildingId === buildingId ? undefined : buildingId;\n",
    "    this.focusedBuildingId = undefined;\n    this.buildDockOpen = false;\n    this.selectedBuildingId = this.selectedBuildingId === buildingId ? undefined : buildingId;\n",
)
replace_once(
    mayor,
    "    this.root.querySelectorAll<HTMLButtonElement>('[data-presentation-toggle]').forEach((button) => button.addEventListener('click', () => {\n      this.presentationMode = this.presentationMode === 'city' ? 'grid' : 'city';\n      if (this.lastView) this.render(this.lastView);\n    }));\n",
    "    this.root.querySelectorAll<HTMLButtonElement>('[data-presentation-toggle]').forEach((button) => button.addEventListener('click', () => {\n      this.presentationMode = this.presentationMode === 'city' ? 'grid' : 'city';\n      if (this.lastView) this.render(this.lastView);\n    }));\n    this.root.querySelectorAll<HTMLButtonElement>('[data-build-dock-toggle]').forEach((button) => button.addEventListener('click', () => {\n      this.buildDockOpen = !this.buildDockOpen;\n      this.activePanel = 'none';\n      this.selectedBuildingId = undefined;\n      if (this.lastView) this.render(this.lastView);\n    }));\n",
)

css = 'src/ui/hologram-sandbox.css'
replace_once(css, '  inset: 0 0 98px;\n', '  inset: 0;\n')
replace_once(css, '  .hologram-canvas-host { inset-bottom: 96px; }\n', '  .hologram-canvas-host { inset-bottom: 0; }\n')
replace_once(css, '  .hologram-canvas-host { inset-bottom: 86px; }\n', '  .hologram-canvas-host { inset-bottom: 0; }\n')
append_once(
    css,
    '.hologram-build-options { min-width: 0; display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; }',
    ".hologram-build-dock header { position: relative; }\n.hologram-build-dock header > button {\n  position: absolute;\n  right: 6px;\n  top: 5px;\n  width: 26px;\n  height: 26px;\n  border: 1px solid rgba(120, 218, 255, .28);\n  border-radius: 8px;\n  color: #b9d8e7;\n  background: rgba(4, 22, 35, .78);\n  cursor: pointer;\n}\n.hologram-build-dock header > button:hover { color: #fff; border-color: var(--scenario-accent); }",
)

world = 'src/presentation/pixi/ImmersivePixiWorld.ts'
replace_once(
    world,
    "  residential: 10.2,\n  commercial: 10.8,\n  industrial: 10.6,\n  public: 10.4,\n  old_town: 10.8\n",
    "  residential: 8.9,\n  commercial: 9.3,\n  industrial: 9.1,\n  public: 8.9,\n  old_town: 9.2\n",
)
replace_once(
    world,
    "    ? 128\n    : facility.configId.includes('wind')\n      ? 184\n      : facility.configId.includes('gas')\n        ? 172\n        : facility.configId.includes('battery')\n          ? 158\n          : 174;\n",
    "    ? 116\n    : facility.configId.includes('wind')\n      ? 158\n      : facility.configId.includes('gas')\n        ? 150\n        : facility.configId.includes('battery')\n          ? 142\n          : 150;\n",
)
replace_once(world, "      slot.addChild(this.makeSprite(texture, 1024, 0.5, 1));\n", "      slot.addChild(this.makeSprite(texture, 1120, 0.5, 1));\n")
replace_once(
    world,
    "    for (const facility of facilities) {\n      this.addFacilityLot(facility, generation);\n",
    "    for (const facility of facilities) {\n      if (!authored || state.levelId !== 'city-01') this.addFacilityLot(facility, generation);\n",
)

layout = 'src/presentation/layout/LevelSceneLayoutRegistry.ts'
replace_once(layout, '  focus: { x: 54, y: 50, elevation: 0 },\n', '  focus: { x: 53, y: 47, elevation: 0 },\n')
replace_once(layout, '    startZoom: 1.34,\n', '    startZoom: 1.43,\n')
replace_once(layout, '    startOffsetY: -6,\n', '    startOffsetY: -14,\n')

test = 'src/presentation/CitySceneMapper.test.ts'
replace_once(test, '    expect(scene.camera.startZoom).toBe(1.34);\n', '    expect(scene.camera.startZoom).toBe(1.43);\n')
replace_once(test, '    expect(scene.focus).toEqual(toScenePoint({ x: 54, y: 50, elevation: 0 }));\n', '    expect(scene.focus).toEqual(toScenePoint({ x: 53, y: 47, elevation: 0 }));\n')
