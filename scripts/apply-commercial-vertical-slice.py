from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:80]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/presentation/CitySceneTypes.ts',
    "export type EnergyNetworkEdgeStatus = 'normal' | 'overload' | 'offline' | 'planned';\n",
    "export type EnergyNetworkEdgeStatus = 'normal' | 'overload' | 'offline' | 'planned';\n"
    "export type CityPresentationMode = 'city' | 'grid';\n"
)
replace_once(
    'src/presentation/CitySceneTypes.ts',
    "  sceneMode?: 'procedural' | 'authored';\n",
    "  sceneMode?: 'procedural' | 'authored';\n  presentationMode?: CityPresentationMode;\n"
)

replace_once(
    'src/presentation/CitySceneMapper.ts',
    "import type {\n  CitySceneState,\n",
    "import type {\n  CityPresentationMode,\n  CitySceneState,\n"
)
replace_once(
    'src/presentation/CitySceneMapper.ts',
    "  CityScenePlacementState,\n  CitySceneState,\n",
    "  CityPresentationMode,\n  CityScenePlacementState,\n  CitySceneState,\n"
)
replace_once(
    'src/presentation/CitySceneMapper.ts',
    "  static map(view: GameViewModel, selectedBuildingId?: string): CitySceneState {\n",
    "  static map(\n    view: GameViewModel,\n    selectedBuildingId?: string,\n    presentationMode: CityPresentationMode = 'city'\n  ): CitySceneState {\n"
)
replace_once(
    'src/presentation/CitySceneMapper.ts',
    "      sceneMode: layout ? 'authored' : 'procedural',\n      growth,\n",
    "      sceneMode: layout ? 'authored' : 'procedural',\n      presentationMode,\n      growth,\n"
)

replace_once(
    'src/ui/MayorDashboard.ts',
    "  private activePanel: MayorPanel = 'none';\n  private selectedBuildingId?: string;\n",
    "  private activePanel: MayorPanel = 'none';\n  private presentationMode: 'city' | 'grid' = 'city';\n  private selectedBuildingId?: string;\n"
)
replace_once(
    'src/ui/MayorDashboard.ts',
    "    this.sandbox?.setState(CitySceneMapper.map(view, this.selectedBuildingId));\n",
    "    this.sandbox?.setState(CitySceneMapper.map(view, this.selectedBuildingId, this.presentationMode));\n"
)
replace_once(
    'src/ui/MayorDashboard.ts',
    "        <button data-camera-zoom=\"out\" title=\"缩小沙盘\"><i>－</i><span>缩小</span></button>\n        ${items.map(([panel, label, icon]) => `\n",
    "        <button data-camera-zoom=\"out\" title=\"缩小沙盘\"><i>－</i><span>缩小</span></button>\n"
    "        <button data-presentation-toggle=\"true\" aria-pressed=\"${this.presentationMode === 'grid'}\" class=\"${this.presentationMode === 'grid' ? 'active' : ''}\" title=\"切换城市经营与电网诊断视图\"><i>⌁</i><span>${this.presentationMode === 'grid' ? '城市' : '电网'}</span></button>\n"
    "        ${items.map(([panel, label, icon]) => `\n"
)
replace_once(
    'src/ui/MayorDashboard.ts',
    "    this.root.querySelectorAll<HTMLButtonElement>('[data-camera-zoom]').forEach((button) => button.addEventListener('click', () => this.sandbox?.zoomBy(button.dataset.cameraZoom === 'in' ? 1.16 : 0.86)));\n    this.root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => button.addEventListener('click', () => this.actions.onSpeedChange(Number(button.dataset.speed) as GameSpeed)));\n",
    "    this.root.querySelectorAll<HTMLButtonElement>('[data-camera-zoom]').forEach((button) => button.addEventListener('click', () => this.sandbox?.zoomBy(button.dataset.cameraZoom === 'in' ? 1.16 : 0.86)));\n"
    "    this.root.querySelectorAll<HTMLButtonElement>('[data-presentation-toggle]').forEach((button) => button.addEventListener('click', () => {\n"
    "      this.presentationMode = this.presentationMode === 'city' ? 'grid' : 'city';\n"
    "      if (this.lastView) this.render(this.lastView);\n"
    "    }));\n"
    "    this.root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => button.addEventListener('click', () => this.actions.onSpeedChange(Number(button.dataset.speed) as GameSpeed)));\n"
)
replace_once(
    'src/ui/MayorDashboard.ts',
    "  private selectBuilding(buildingId?: string): void {\n    this.activePanel = 'none';\n    this.focusedBuildingId = undefined;\n",
    "  private selectBuilding(buildingId?: string): void {\n    this.activePanel = 'none';\n    this.presentationMode = 'city';\n    this.focusedBuildingId = undefined;\n"
)

replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "import { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';\n",
    "import {\n  shouldRenderDistrictLabel,\n  shouldRenderNetworkEdge,\n  shouldRenderNetworkNodeAsset,\n  shouldRenderNetworkNodeDiagnostics\n} from '../CommercialPresentationPolicy';\nimport { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "    const authored = state.sceneMode === 'authored' && Boolean(state.districtPrefabs?.length);\n\n    this.drawTerrain(state, accent);\n",
    "    const authored = state.sceneMode === 'authored' && Boolean(state.districtPrefabs?.length);\n"
    "    const showDiagnostics = state.presentationMode === 'grid';\n"
    "    this.host.dataset.presentationMode = showDiagnostics ? 'grid' : 'city';\n\n"
    "    this.drawTerrain(state, accent);\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "      this.drawEnergyNetwork(state, generation);\n      this.drawDistrictPrefabs(state, generation);\n",
    "      this.drawEnergyNetwork(state, generation, showDiagnostics);\n      this.drawDistrictPrefabs(state, generation, showDiagnostics);\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "  private drawEnergyNetwork(state: CitySceneState, generation: number): void {\n",
    "  private drawEnergyNetwork(\n    state: CitySceneState,\n    generation: number,\n    showDiagnostics: boolean\n  ): void {\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "    for (const edge of state.networkEdges ?? []) {\n      if (edge.points.length < 2) continue;\n      const color = networkEdgeColor(edge);\n",
    "    for (const edge of state.networkEdges ?? []) {\n      if (edge.points.length < 2 || !shouldRenderNetworkEdge(edge, showDiagnostics)) continue;\n      const color = networkEdgeColor(edge);\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "    for (const node of state.networkNodes ?? []) {\n      this.drawNetworkNode(node, generation);\n    }\n",
    "    for (const node of state.networkNodes ?? []) {\n      this.drawNetworkNode(node, generation, showDiagnostics);\n    }\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "  private drawNetworkNode(node: EnergyNetworkNodeSceneState, generation: number): void {\n    if (node.kind === 'district') return;\n    const color = networkNodeColor(node);\n    if (node.kind === 'substation' || node.kind === 'distribution') {\n",
    "  private drawNetworkNode(\n    node: EnergyNetworkNodeSceneState,\n    generation: number,\n    showDiagnostics: boolean\n  ): void {\n    if (node.kind === 'district') return;\n    const color = networkNodeColor(node);\n    if (shouldRenderNetworkNodeAsset(node, showDiagnostics) && (node.kind === 'substation' || node.kind === 'distribution')) {\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "    }\n\n    const position = this.project({ ...node, elevation: 0.35 });\n",
    "    }\n\n    if (!shouldRenderNetworkNodeDiagnostics(node, showDiagnostics)) return;\n\n    const position = this.project({ ...node, elevation: 0.35 });\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "  private drawDistrictPrefabs(state: CitySceneState, generation: number): void {\n",
    "  private drawDistrictPrefabs(\n    state: CitySceneState,\n    generation: number,\n    showDiagnostics: boolean\n  ): void {\n"
)
replace_once(
    'src/presentation/pixi/ImmersivePixiWorld.ts',
    "      this.drawDistrictDecorations(district);\n      this.drawDistrictLabel(district);\n",
    "      this.drawDistrictDecorations(district);\n      if (shouldRenderDistrictLabel(district, showDiagnostics)) this.drawDistrictLabel(district);\n"
)

print('Applied commercial vertical-slice presentation policy.')
