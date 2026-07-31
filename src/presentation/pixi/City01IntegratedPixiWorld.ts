import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  type Texture
} from 'pixi.js';
import type {
  CitySceneState,
  DistrictPrefabSceneState,
  EnergyNetworkEdgeSceneState,
  EnergyNetworkNodeSceneState,
  FacilitySceneState,
  PlotSceneState,
  RoadSceneState,
  ScenePoint
} from '../CitySceneTypes';
import {
  selectVisibleNetworkEdges,
  shouldRenderDistrictLabel,
  shouldRenderNetworkNodeAsset,
  shouldRenderNetworkNodeDiagnostics
} from '../CommercialPresentationPolicy';
import { planCommercialFacilities } from '../CommercialLandmarkPlanner';
import { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import {
  city01IslandBoundary,
  city01MapPlacements,
  type City01MapLayer,
  type City01MapPlacement
} from './City01MapComposition';
import {
  resolveCityPresentationMode,
  shouldDrawAvailablePlotHints,
  shouldDrawDiagnosticStructure,
  shouldDrawEnergyNetwork,
  shouldDrawPlotGrounds,
  type ResolvedCityPresentationMode
} from './City01PresentationPolicy';
import { PixiAssetLoader } from './PixiAssetLoader';
import { buildCity01AccessRoads } from './City01RoadTopology';
import { WorldCamera } from './WorldCamera';
import { WorldInputController } from './WorldInputController';
import { WorldLayerManager } from './WorldLayerManager';

const SCENE_UNITS_PER_GRID = 10;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;
const ELEVATION_HEIGHT = 11.5;

const districtWidths: Record<DistrictPrefabSceneState['kind'], number> = {
  residential: 326,
  commercial: 322,
  industrial: 334,
  public: 324,
  old_town: 330
};

const districtLabelOffsets: Record<DistrictPrefabSceneState['kind'], { x: number; y: number }> = {
  residential: { x: -66, y: -66 },
  commercial: { x: -86, y: 48 },
  industrial: { x: 90, y: 44 },
  public: { x: -90, y: 45 },
  old_town: { x: -92, y: 44 }
};

const placementAssets = {
  valid: 'city01_placement_valid',
  warning: 'city01_placement_warning',
  invalid: 'city01_placement_invalid'
} as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const districtStatusColor = (district: DistrictPrefabSceneState): number => {
  if (district.status === 'normal') return 0x5ce1a3;
  if (district.status === 'warning') return 0xffd45f;
  if (district.status === 'blackout') return 0xff9b54;
  return 0xff667f;
};

const networkColor = (status: EnergyNetworkEdgeSceneState['status']): number => {
  if (status === 'normal') return 0x45cfff;
  if (status === 'overload') return 0xffb347;
  if (status === 'offline') return 0xff5b68;
  return 0x6f858d;
};

const facilityWidth = (facility: FacilitySceneState): number => {
  const base = facility.configId.includes('solar')
    ? 232
    : facility.configId.includes('wind')
      ? 226
      : facility.configId.includes('gas')
        ? 244
        : facility.configId.includes('battery')
          ? 230
          : 228;
  return base * clamp(facility.scale, 0.85, 1.18) * 0.72;
};

const gamePlacementAlpha = (placement: City01MapPlacement): number => {
  const authoredAlpha = placement.alpha ?? 1;
  if (placement.layer === 'terrain') return authoredAlpha;
  if (placement.layer === 'roads') return Math.min(authoredAlpha, 0.55);
  if (placement.layer === 'groundDecorations') return Math.min(authoredAlpha, 0.42);
  return Math.min(authoredAlpha, 0.78);
};

export class City01IntegratedPixiWorld implements WorldRenderSurface {
  private readonly app = new Application();
  private readonly layerManager = new WorldLayerManager();
  private readonly assets = new PixiAssetLoader();
  private camera?: WorldCamera;
  private input?: WorldInputController;
  private resizeObserver?: ResizeObserver;
  private state?: CitySceneState;
  private mounted = false;
  private ready = false;
  private renderGeneration = 0;
  private pendingPlotId?: string;
  private placementBuildingId?: string;

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: WorldRenderActions
  ) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.host.dataset.worldRenderer = 'city01-integrated';
    void this.initialize().catch((error: unknown) => {
      console.error('City-01 integrated renderer failed to initialize:', error);
      this.host.dataset.pixiFailed = 'true';
    });
  }

  destroy(): void {
    this.mounted = false;
    this.ready = false;
    this.renderGeneration += 1;
    this.pendingPlotId = undefined;
    this.placementBuildingId = undefined;
    this.input?.destroy();
    this.input = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.layerManager.clear();
    if (this.app.renderer) {
      this.app.destroy(
        { removeView: true },
        { children: true, texture: false, textureSource: false, context: true }
      );
    }
    this.host.replaceChildren();
  }

  setState(next: CitySceneState): void {
    const levelChanged = this.state?.levelId !== next.levelId;
    const nextPlacementId = next.placement?.buildingId;
    if (nextPlacementId !== this.placementBuildingId) this.pendingPlotId = undefined;
    this.placementBuildingId = nextPlacementId;
    this.state = next;
    if (!this.ready) return;
    this.renderScene(next);
    if (levelChanged) this.focusHome();
  }

  focusHome(): void {
    if (!this.state || !this.camera) return;
    const focus = this.project(this.state.focus ?? this.state.city);
    this.camera.configure(this.state.camera);
    this.camera.setPivot(focus.x, focus.y);
    this.camera.focusHome();
  }

  zoomBy(factor: number): void {
    this.camera?.zoomBy(factor);
  }

  private async initialize(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      backgroundColor: 0x03111a,
      antialias: true,
      preference: 'webgl',
      powerPreference: 'high-performance'
    });
    if (!this.mounted) {
      this.app.destroy({ removeView: true }, { children: true, context: true });
      return;
    }

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.className = 'hologram-sandbox-canvas pixi-world-canvas immersive-world-canvas city01-integrated-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', '曙光新城地图，可拖动、缩放并通过两次点击确认建设');
    this.host.replaceChildren(canvas);
    this.app.stage.addChild(this.layerManager.root);

    this.camera = new WorldCamera(this.layerManager.root);
    this.camera.setViewport(this.host.clientWidth, this.host.clientHeight);
    this.input = new WorldInputController(canvas, this.camera);
    this.input.mount();
    this.resizeObserver = new ResizeObserver(() => {
      this.camera?.setViewport(this.host.clientWidth, this.host.clientHeight);
    });
    this.resizeObserver.observe(this.host);
    this.ready = true;

    if (this.state) {
      this.renderScene(this.state);
      this.focusHome();
    }
  }

  private renderScene(state: CitySceneState): void {
    const generation = ++this.renderGeneration;
    this.layerManager.clear();
    const mode = resolveCityPresentationMode(state.presentationMode);
    const diagnostics = shouldDrawDiagnosticStructure(mode);
    const hasPlacement = Boolean(state.placement);
    this.host.dataset.presentationMode = mode;

    this.drawOcean(state, generation, diagnostics);
    if (diagnostics) this.drawIslandBase();
    if (diagnostics) this.drawRoadBackbone(state);
    this.drawMapComposition(generation, mode);
    if (shouldDrawPlotGrounds(mode, hasPlacement)) {
      this.drawPlotGrounds(state, generation, diagnostics);
    }
    if (shouldDrawEnergyNetwork(mode)) this.drawNetwork(state, generation, diagnostics);
    this.drawDistricts(state, generation, diagnostics);
    this.drawFacilities(state, generation);
    if (shouldDrawAvailablePlotHints(mode, hasPlacement)) {
      this.drawAvailablePlotHints(state);
    }
    this.drawPlacementPlots(state, generation);

    for (const layer of Object.values(this.layerManager.layers)) layer.sortChildren();
  }

  private project(point: ScenePoint): { x: number; y: number } {
    const gridX = point.x / SCENE_UNITS_PER_GRID;
    const gridY = point.z / SCENE_UNITS_PER_GRID;
    return {
      x: (gridX - gridY) * TILE_WIDTH * 0.5,
      y: (gridX + gridY) * TILE_HEIGHT * 0.5 - point.elevation * ELEVATION_HEIGHT
    };
  }

  private depth(point: ScenePoint, offset = 0): number {
    return Math.round((point.x + point.z) * 1000 + point.elevation * 100 + offset);
  }

  private tracePath(graphics: Graphics, points: readonly ScenePoint[]): void {
    const first = points[0];
    if (!first) return;
    const start = this.project(first);
    graphics.moveTo(start.x, start.y);
    for (const point of points.slice(1)) {
      const projected = this.project(point);
      graphics.lineTo(projected.x, projected.y);
    }
  }

  private drawOcean(state: CitySceneState, generation: number, diagnostics: boolean): void {
    const center = state.focus ?? state.city;
    this.addAsset({
      assetId: 'city01_ocean_water_base',
      point: { ...center, elevation: -2 },
      width: 2240,
      anchorY: 0.5,
      generation,
      layer: this.layerManager.layers.terrain,
      alpha: diagnostics ? 0.72 : 1,
      placeholderColor: 0x063f50,
      zIndexOverride: -1000000
    });
  }

  private drawIslandBase(): void {
    const projected = city01IslandBoundary.map((point) => this.project(point));
    const surfacePoints = projected.flatMap((point) => [point.x, point.y]);
    const cliffPoints = projected.flatMap((point) => [point.x, point.y + 18]);

    const cliff = new Graphics()
      .poly(cliffPoints)
      .fill({ color: 0x0b1716, alpha: 0.68 })
      .stroke({ color: 0x03090a, alpha: 0.72, width: 2 });
    cliff.zIndex = -930000;
    this.layerManager.layers.terrain.addChild(cliff);

    const surface = new Graphics()
      .poly(surfacePoints)
      .fill({ color: 0x193631, alpha: 0.98 })
      .stroke({ color: 0x78948a, alpha: 0.2, width: 2 });
    surface.zIndex = -920000;
    this.layerManager.layers.terrain.addChild(surface);

    const inner = projected.map((point) => ({ x: point.x * 0.965, y: point.y * 0.965 + 2 }));
    const innerGround = new Graphics()
      .poly(inner.flatMap((point) => [point.x, point.y]))
      .fill({ color: 0x18322e, alpha: 0.38 });
    innerGround.zIndex = -919900;
    this.layerManager.layers.terrain.addChild(innerGround);
  }

  private drawRoadBackbone(state: CitySceneState): void {
    const roads: RoadSceneState[] = [...state.roads, ...buildCity01AccessRoads(state)];
    for (const [index, road] of roads.entries()) {
      if (road.points.length < 2) continue;
      const laneScale = road.laneCount === 2 ? 1.25 : 1;
      const alpha = 0.42;

      const curb = new Graphics();
      this.tracePath(curb, road.points);
      curb.stroke({ color: 0xd7cdb3, alpha: alpha * 0.92, width: 19 * laneScale, cap: 'round', join: 'round' });
      curb.zIndex = -510000 + index * 4;
      this.layerManager.layers.roads.addChild(curb);

      const edge = new Graphics();
      this.tracePath(edge, road.points);
      edge.stroke({ color: 0x252d2f, alpha, width: 16 * laneScale, cap: 'round', join: 'round' });
      edge.zIndex = -509999 + index * 4;
      this.layerManager.layers.roads.addChild(edge);

      const asphalt = new Graphics();
      this.tracePath(asphalt, road.points);
      asphalt.stroke({ color: 0x364247, alpha, width: 12.5 * laneScale, cap: 'round', join: 'round' });
      asphalt.zIndex = -509998 + index * 4;
      this.layerManager.layers.roads.addChild(asphalt);

      const centerLine = new Graphics();
      this.tracePath(centerLine, road.points);
      centerLine.stroke({
        color: 0xe0c45e,
        alpha: 0.12,
        width: road.laneCount === 2 ? 1.25 : 0.8,
        cap: 'round',
        join: 'round'
      });
      centerLine.zIndex = -509997 + index * 4;
      this.layerManager.layers.roads.addChild(centerLine);
    }
  }

  private drawMapComposition(
    generation: number,
    mode: ResolvedCityPresentationMode
  ): void {
    const layers: Record<City01MapLayer, Container> = {
      terrain: this.layerManager.layers.terrain,
      roads: this.layerManager.layers.roads,
      groundDecorations: this.layerManager.layers.groundDecorations,
      vehicles: this.layerManager.layers.vehicles
    };
    const colors: Record<City01MapLayer, number> = {
      terrain: 0x315c4c,
      roads: 0x4a4f4f,
      groundDecorations: 0x4a7d58,
      vehicles: 0x78b9ce
    };

    for (const placement of city01MapPlacements) {
      const alpha = mode === 'grid'
        ? placement.diagnosticsAlpha ?? 0.44
        : mode === 'showcase'
          ? placement.alpha ?? 1
          : gamePlacementAlpha(placement);
      if (alpha <= 0) continue;
      this.addAsset({
        assetId: placement.assetId,
        point: placement.point,
        width: placement.width,
        anchorY: placement.anchorY,
        generation,
        layer: layers[placement.layer],
        alpha,
        flipX: placement.flipX,
        placeholderColor: colors[placement.layer]
      });
    }
  }

  private drawPlotGrounds(state: CitySceneState, generation: number, diagnostics: boolean): void {
    for (const plot of state.plots) {
      if (plot.locked) continue;
      if (!diagnostics && (plot.occupied || !plot.placementTone)) continue;
      this.addAsset({
        assetId: plot.groundAssetId,
        point: { ...plot, elevation: plot.elevation - 0.08 },
        width: 142 * plot.scale,
        anchorY: 0.82,
        generation,
        layer: this.layerManager.layers.groundDecorations,
        alpha: diagnostics ? 0.36 : plot.available ? 0.42 : 0.2,
        placeholderColor: 0x4a7658,
        zIndexOverride: this.depth(plot, -120)
      });
    }
  }

  private drawDistricts(state: CitySceneState, generation: number, diagnostics: boolean): void {
    for (const district of state.districtPrefabs ?? []) {
      if (!district.prefabAssetId) continue;
      const suffix = district.status === 'blackout' || district.status === 'offline' ? 'blackout' : 'night';
      this.addAsset({
        assetId: `${district.prefabAssetId}_${suffix}`,
        point: { ...district, elevation: district.elevation + 0.18 },
        width: districtWidths[district.kind] * district.scale,
        anchorY: 0.9115,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: district.status === 'offline' ? 0.76 : 1,
        placeholderColor: districtStatusColor(district)
      });
      if (shouldRenderDistrictLabel(district, diagnostics)) this.drawDistrictLabel(district);
    }
  }

  private drawDistrictLabel(district: DistrictPrefabSceneState): void {
    const center = this.project({ ...district, elevation: 2.2 });
    const offset = districtLabelOffsets[district.kind];
    const color = districtStatusColor(district);
    const label = new Text({
      text: district.status === 'normal' ? district.label : `${district.label} · ${Math.round(district.powerRatio * 100)}%`,
      style: { fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif', fontSize: 11, fontWeight: '600', fill: 0xeefaff }
    });
    label.anchor.set(0.5);
    const width = Math.max(80, label.width + 24);
    const panel = new Graphics()
      .roundRect(-width * 0.5, -12, width, 24, 7)
      .fill({ color: 0x061722, alpha: 0.84 })
      .stroke({ color, alpha: 0.65, width: 1 });
    const container = new Container();
    container.position.set(center.x + offset.x, center.y + offset.y);
    container.zIndex = this.depth(district, 300);
    container.addChild(panel, label);
    this.layerManager.layers.overlays.addChild(container);
  }

  private drawFacilities(state: CitySceneState, generation: number): void {
    for (const facility of planCommercialFacilities(state.facilities)) {
      const visual = FacilityVisualRegistry.resolve({
        configId: facility.configId,
        category: facility.category,
        enabled: facility.enabled,
        selected: false,
        constructionProgress: facility.constructionProgress,
        presentation: 'commercial'
      });
      this.addAsset({
        assetId: visual.bodyAssetId,
        point: { ...facility, elevation: facility.elevation + 0.12 },
        width: facilityWidth(facility),
        anchorY: 0.9115,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: facility.underConstruction ? 0.92 : facility.enabled ? 1 : 0.72,
        placeholderColor: 0x78dfff,
        onActivate: () => this.actions.onFacilityClick(facility.instanceId)
      });
      if (facility.underConstruction) this.drawConstructionStatus(facility);
    }
  }

  private drawConstructionStatus(facility: FacilitySceneState): void {
    const position = this.project({ ...facility, elevation: facility.elevation + 3.2 });
    const progress = clamp(facility.constructionProgress, 0, 1);
    const container = new Container();
    container.position.set(position.x, position.y - 34);
    container.zIndex = this.depth(facility, 420);
    const panel = new Graphics()
      .roundRect(-48, -14, 96, 28, 8)
      .fill({ color: 0x061722, alpha: 0.9 })
      .stroke({ color: 0xffd45f, alpha: 0.82, width: 1 })
      .roundRect(-38, 5, 76, 4, 2)
      .fill({ color: 0x243238, alpha: 1 })
      .roundRect(-38, 5, 76 * progress, 4, 2)
      .fill({ color: 0xffd45f, alpha: 1 });
    const label = new Text({
      text: `施工 ${Math.round(progress * 100)}%`,
      style: { fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif', fontSize: 10, fontWeight: '600', fill: 0xfff3c4 }
    });
    label.anchor.set(0.5);
    label.position.set(0, -3);
    container.addChild(panel, label);
    this.layerManager.layers.overlays.addChild(container);
  }

  private drawNetwork(state: CitySceneState, generation: number, diagnostics: boolean): void {
    for (const edge of selectVisibleNetworkEdges(state.networkEdges ?? [], diagnostics)) {
      if (edge.points.length < 2) continue;
      const color = networkColor(edge.status);
      const glow = new Graphics();
      this.tracePath(glow, edge.points);
      glow.stroke({ color, alpha: diagnostics ? 0.12 : 0.025, width: diagnostics ? 8 : 3, cap: 'round', join: 'round' });
      glow.zIndex = this.depth(edge.points[0]!, -4);
      this.layerManager.layers.groundDecorations.addChild(glow);

      const line = new Graphics();
      this.tracePath(line, edge.points);
      line.stroke({ color, alpha: diagnostics ? 0.72 : edge.status === 'offline' ? 0.24 : 0.16, width: diagnostics ? 2.2 : 0.9, cap: 'round', join: 'round' });
      line.zIndex = this.depth(edge.points[0]!, -3);
      this.layerManager.layers.groundDecorations.addChild(line);
    }

    for (const node of state.networkNodes ?? []) {
      if (node.kind === 'district') continue;
      if (shouldRenderNetworkNodeAsset(node, diagnostics)
        && (node.kind === 'substation' || node.kind === 'distribution')) {
        const stateSuffix = node.status === 'offline' ? 'offline' : node.status === 'warning' ? 'overload' : 'active';
        const assetId = node.kind === 'substation'
          ? `commercial_facility_substation_${node.status === 'offline' ? 'offline' : 'active'}`
          : `world_facility_grid_node_${stateSuffix}`;
        this.addAsset({
          assetId,
          point: { ...node, elevation: node.elevation + 0.3 },
          width: node.kind === 'substation' ? 230 : 168,
          anchorY: 0.9115,
          generation,
          layer: this.layerManager.layers.buildings,
          alpha: node.status === 'offline' ? 0.72 : 1,
          placeholderColor: networkColor(node.status === 'warning' ? 'overload' : node.status === 'offline' ? 'offline' : 'normal')
        });
      }
      if (shouldRenderNetworkNodeDiagnostics(node, diagnostics)) this.drawNodeDiagnostic(node);
    }
  }

  private drawNodeDiagnostic(node: EnergyNetworkNodeSceneState): void {
    const position = this.project({ ...node, elevation: 0.35 });
    const color = node.status === 'warning' ? 0xffb347 : node.status === 'offline' ? 0xff667f : 0x55ddff;
    const marker = new Graphics()
      .circle(position.x, position.y, node.kind === 'substation' ? 11 : 8)
      .fill({ color: 0x061722, alpha: 0.8 })
      .stroke({ color, alpha: 0.9, width: 2 })
      .circle(position.x, position.y, 3)
      .fill({ color, alpha: 1 });
    marker.zIndex = this.depth(node, 220);
    this.layerManager.layers.effects.addChild(marker);
  }

  private drawAvailablePlotHints(state: CitySceneState): void {
    for (const plot of state.plots) {
      if (plot.locked || plot.occupied) continue;
      const position = this.project({ ...plot, elevation: plot.elevation + 0.16 });
      const scale = clamp(plot.scale, 0.72, 1.08);
      const radius = 7 * scale;
      const marker = new Container();
      marker.position.set(position.x, position.y);
      marker.zIndex = this.depth(plot, 180);
      marker.eventMode = 'static';
      marker.cursor = 'pointer';
      marker.hitArea = new Rectangle(-18, -18, 36, 36);

      const diamond = new Graphics()
        .poly([0, -radius, radius * 1.5, 0, 0, radius, -radius * 1.5, 0])
        .fill({ color: 0x09242d, alpha: 0.14 })
        .stroke({ color: 0x66e5c8, alpha: 0.22, width: 0.8 });
      const dot = new Graphics()
        .circle(0, 0, 1.6 * scale)
        .fill({ color: 0xa5ffe9, alpha: 0.45 });
      marker.addChild(diamond, dot);
      marker.on('pointertap', () => {
        if (this.input?.canActivateObject()) this.actions.onPlotClick(plot.id);
      });
      this.layerManager.layers.overlays.addChild(marker);
    }
  }

  private drawPlacementPlots(state: CitySceneState, generation: number): void {
    if (!state.placement) return;
    for (const plot of state.plots) {
      if (plot.occupied || plot.locked || !plot.placementTone) continue;
      this.drawPlacementPlot(plot, generation);
    }
  }

  private drawPlacementPlot(plot: PlotSceneState, generation: number): void {
    const pending = this.pendingPlotId === plot.id;
    const tone = plot.placementTone ?? (plot.available ? 'valid' : 'invalid');
    this.addAsset({
      assetId: placementAssets[tone],
      point: { ...plot, elevation: plot.elevation + 0.1 },
      width: (pending ? 154 : 142) * plot.scale,
      anchorY: 0.72,
      generation,
      layer: this.layerManager.layers.overlays,
      alpha: pending ? 1 : 0.82,
      placeholderColor: tone === 'valid' ? 0x5ce1a3 : tone === 'warning' ? 0xffd45f : 0xff667f,
      zIndexOverride: this.depth(plot, 250),
      onActivate: plot.available ? () => this.activatePlot(plot.id) : undefined
    });

    if (pending) {
      this.addAsset({
        assetId: 'city01_placement_footprint',
        point: { ...plot, elevation: plot.elevation + 0.16 },
        width: 126 * plot.scale,
        anchorY: 0.72,
        generation,
        layer: this.layerManager.layers.overlays,
        alpha: 0.92,
        placeholderColor: 0xffffff,
        zIndexOverride: this.depth(plot, 270)
      });
      const position = this.project({ ...plot, elevation: plot.elevation + 2.4 });
      const label = new Text({
        text: '再次点击确认建设',
        style: { fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif', fontSize: 11, fontWeight: '700', fill: 0xffffff }
      });
      label.anchor.set(0.5);
      const panel = new Graphics()
        .roundRect(-66, -13, 132, 26, 8)
        .fill({ color: 0x061722, alpha: 0.92 })
        .stroke({ color: 0x5ce1a3, alpha: 0.85, width: 1 });
      const container = new Container();
      container.position.set(position.x, position.y - 38);
      container.zIndex = this.depth(plot, 300);
      container.addChild(panel, label);
      this.layerManager.layers.overlays.addChild(container);
    }
  }

  private activatePlot(plotId: string): void {
    if (!this.state) return;
    if (this.pendingPlotId === plotId) {
      this.pendingPlotId = undefined;
      this.actions.onPlotClick(plotId);
      return;
    }
    this.pendingPlotId = plotId;
    this.renderScene(this.state);
  }

  private addAsset(options: {
    assetId: string;
    point: ScenePoint;
    width: number;
    anchorY: number;
    generation: number;
    layer: Container;
    placeholderColor: number;
    alpha?: number;
    flipX?: boolean;
    zIndexOverride?: number;
    onActivate?: () => void;
  }): void {
    const position = this.project(options.point);
    const slot = new Container();
    slot.position.set(position.x, position.y);
    slot.zIndex = options.zIndexOverride ?? this.depth(options.point);
    slot.hitArea = new Rectangle(-options.width * 0.45, -options.width, options.width * 0.9, options.width);

    const placeholder = new Graphics()
      .poly([
        -options.width * 0.32, -options.width * 0.24,
        0, -options.width * 0.42,
        options.width * 0.32, -options.width * 0.24,
        0, -options.width * 0.06
      ])
      .fill({ color: options.placeholderColor, alpha: options.zIndexOverride ? 0 : 0.16 });
    slot.addChild(placeholder);

    if (options.onActivate) {
      slot.eventMode = 'static';
      slot.cursor = 'pointer';
      slot.on('pointertap', () => {
        if (this.input?.canActivateObject()) options.onActivate?.();
      });
    }
    options.layer.addChild(slot);

    void this.assets.load(options.assetId).then((texture) => {
      if (!texture || !this.mounted || options.generation !== this.renderGeneration || slot.destroyed) return;
      for (const child of slot.removeChildren()) child.destroy();
      slot.addChild(this.makeSprite(texture, options.width, options.anchorY, options.alpha ?? 1, options.flipX ?? false));
    });
  }

  private makeSprite(texture: Texture, width: number, anchorY: number, alpha: number, flipX: boolean): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, anchorY);
    const scale = width / Math.max(1, texture.width);
    sprite.scale.set(flipX ? -scale : scale, scale);
    sprite.alpha = alpha;
    return sprite;
  }
}
