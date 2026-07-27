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
  ScenePoint
} from '../CitySceneMapper';
import {
  selectVisibleNetworkEdges,
  shouldRenderDistrictLabel,
  shouldRenderNetworkNodeAsset,
  shouldRenderNetworkNodeDiagnostics
} from '../CommercialPresentationPolicy';
import { planCommercialFacilities } from '../CommercialLandmarkPlanner';
import { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { city01MapPlacements, type City01MapLayer } from './City01MapComposition';
import { PixiAssetLoader } from './PixiAssetLoader';
import { WorldCamera } from './WorldCamera';
import { WorldInputController } from './WorldInputController';
import { WorldLayerManager } from './WorldLayerManager';

const SCENE_UNITS_PER_GRID = 10;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;
const ELEVATION_HEIGHT = 11.5;

const districtWidths: Record<DistrictPrefabSceneState['kind'], number> = {
  residential: 338,
  commercial: 332,
  industrial: 344,
  public: 336,
  old_town: 340
};

const districtLabelOffsets: Record<DistrictPrefabSceneState['kind'], { x: number; y: number }> = {
  residential: { x: -62, y: -70 },
  commercial: { x: -88, y: 54 },
  industrial: { x: 88, y: 48 },
  public: { x: -88, y: 50 },
  old_town: { x: -92, y: 48 }
};

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
    ? 244
    : facility.configId.includes('wind')
      ? 232
      : facility.configId.includes('gas')
        ? 252
        : facility.configId.includes('battery')
          ? 238
          : 236;
  return base * clamp(facility.scale, 0.85, 1.18);
};

export class City01MosaicPixiWorld implements WorldRenderSurface {
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

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: WorldRenderActions
  ) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.host.dataset.worldRenderer = 'city01-mosaic';
    void this.initialize().catch((error: unknown) => {
      console.error('City-01 mosaic renderer failed to initialize:', error);
      this.host.dataset.pixiFailed = 'true';
    });
  }

  destroy(): void {
    this.mounted = false;
    this.ready = false;
    this.renderGeneration += 1;
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
    canvas.className = 'hologram-sandbox-canvas pixi-world-canvas immersive-world-canvas city01-mosaic-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', '曙光新城等距城市经营地图，可拖动、缩放和选择设施');
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
    const diagnostics = state.presentationMode === 'grid';
    this.host.dataset.presentationMode = diagnostics ? 'grid' : 'city';

    this.drawWaterStage(state);
    this.drawMapComposition(generation, diagnostics);
    this.drawNetwork(state, generation, diagnostics);
    this.drawDistricts(state, generation, diagnostics);
    this.drawFacilities(state, generation);
    this.drawPlots(state);

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

  private drawWaterStage(state: CitySceneState): void {
    const center = this.project(state.focus ?? state.city);
    const shadow = new Graphics()
      .ellipse(center.x, center.y + 28, 748, 396)
      .fill({ color: 0x01080d, alpha: 0.7 });
    shadow.zIndex = -1000001;
    this.layerManager.layers.terrain.addChild(shadow);

    const water = new Graphics()
      .ellipse(center.x, center.y + 8, 730, 382)
      .fill({ color: 0x0a4d5b, alpha: 1 })
      .stroke({ color: 0x68c7d0, alpha: 0.28, width: 1.5 });
    water.zIndex = -1000000;
    this.layerManager.layers.terrain.addChild(water);
  }

  private drawMapComposition(generation: number, diagnostics: boolean): void {
    const layers: Record<City01MapLayer, Container> = {
      terrain: this.layerManager.layers.terrain,
      roads: this.layerManager.layers.roads,
      groundDecorations: this.layerManager.layers.groundDecorations,
      vehicles: this.layerManager.layers.vehicles
    };
    const colors: Record<City01MapLayer, number> = {
      terrain: 0x24463f,
      roads: 0x35464b,
      groundDecorations: 0x3f7255,
      vehicles: 0x78b9ce
    };

    for (const placement of city01MapPlacements) {
      const alpha = diagnostics
        ? placement.diagnosticsAlpha ?? 0.5
        : placement.alpha ?? 1;
      if (alpha <= 0) continue;
      this.addAsset({
        assetId: placement.assetId,
        point: placement.point,
        width: placement.width,
        anchorY: placement.anchorY,
        generation,
        layer: layers[placement.layer],
        alpha,
        placeholderColor: colors[placement.layer]
      });
    }
  }

  private drawDistricts(
    state: CitySceneState,
    generation: number,
    diagnostics: boolean
  ): void {
    for (const district of state.districtPrefabs ?? []) {
      if (!district.prefabAssetId) continue;
      const suffix = district.status === 'blackout' || district.status === 'offline'
        ? 'blackout'
        : 'night';
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
      text: district.status === 'normal'
        ? district.label
        : `${district.label} · ${Math.round(district.powerRatio * 100)}%`,
      style: {
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 11,
        fontWeight: '600',
        fill: 0xeefaff
      }
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
        constructionProgress: 1,
        presentation: 'commercial'
      });
      this.addAsset({
        assetId: visual.bodyAssetId,
        point: { ...facility, elevation: facility.elevation + 0.12 },
        width: facilityWidth(facility),
        anchorY: 0.9115,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: facility.enabled ? 1 : 0.72,
        placeholderColor: 0x78dfff,
        onActivate: () => this.actions.onFacilityClick(facility.instanceId)
      });
    }
  }

  private drawNetwork(
    state: CitySceneState,
    generation: number,
    diagnostics: boolean
  ): void {
    for (const edge of selectVisibleNetworkEdges(state.networkEdges ?? [], diagnostics)) {
      if (edge.points.length < 2) continue;
      const color = networkColor(edge.status);
      const glow = new Graphics();
      this.tracePath(glow, edge.points);
      glow.stroke({
        color,
        alpha: diagnostics ? 0.12 : 0.045,
        width: diagnostics ? 8 : 4,
        cap: 'round',
        join: 'round'
      });
      glow.zIndex = this.depth(edge.points[0]!, -4);
      this.layerManager.layers.groundDecorations.addChild(glow);

      const line = new Graphics();
      this.tracePath(line, edge.points);
      line.stroke({
        color,
        alpha: diagnostics ? 0.72 : edge.status === 'offline' ? 0.38 : 0.26,
        width: diagnostics ? 2.2 : 1.2,
        cap: 'round',
        join: 'round'
      });
      line.zIndex = this.depth(edge.points[0]!, -3);
      this.layerManager.layers.groundDecorations.addChild(line);
    }

    for (const node of state.networkNodes ?? []) {
      if (node.kind === 'district') continue;
      if (shouldRenderNetworkNodeAsset(node, diagnostics)
        && (node.kind === 'substation' || node.kind === 'distribution')) {
        const stateSuffix = node.status === 'offline'
          ? 'offline'
          : node.status === 'warning'
            ? 'overload'
            : 'active';
        const assetId = node.kind === 'substation'
          ? `commercial_facility_substation_${node.status === 'offline' ? 'offline' : 'active'}`
          : `world_facility_grid_node_${stateSuffix}`;
        this.addAsset({
          assetId,
          point: { ...node, elevation: node.elevation + 0.3 },
          width: node.kind === 'substation' ? 238 : 176,
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
    const color = node.status === 'warning'
      ? 0xffb347
      : node.status === 'offline'
        ? 0xff667f
        : 0x55ddff;
    const marker = new Graphics()
      .circle(position.x, position.y, node.kind === 'substation' ? 11 : 8)
      .fill({ color: 0x061722, alpha: 0.8 })
      .stroke({ color, alpha: 0.9, width: 2 })
      .circle(position.x, position.y, 3)
      .fill({ color, alpha: 1 });
    marker.zIndex = this.depth(node, 220);
    this.layerManager.layers.effects.addChild(marker);
  }

  private drawPlots(state: CitySceneState): void {
    if (!state.placement) return;
    for (const plot of state.plots) {
      if (plot.occupied || plot.locked) continue;
      this.drawPlot(plot);
    }
  }

  private drawPlot(plot: PlotSceneState): void {
    const color = plot.available ? 0x5ce1a3 : plot.blocked ? 0xff667f : 0x4ad7ff;
    const position = this.project(plot);
    const overlay = new Graphics()
      .ellipse(position.x, position.y, 54 * plot.scale, 27 * plot.scale)
      .fill({ color, alpha: plot.available ? 0.18 : 0.05 })
      .stroke({ color, alpha: plot.available ? 0.9 : 0.3, width: plot.available ? 2 : 1 });
    overlay.zIndex = this.depth(plot, 250);
    if (plot.available) {
      overlay.eventMode = 'static';
      overlay.cursor = 'pointer';
      overlay.on('pointertap', () => {
        if (this.input?.canActivateObject()) this.actions.onPlotClick(plot.id);
      });
    }
    this.layerManager.layers.overlays.addChild(overlay);
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
    onActivate?: () => void;
  }): void {
    const position = this.project(options.point);
    const slot = new Container();
    slot.position.set(position.x, position.y);
    slot.zIndex = this.depth(options.point);
    slot.hitArea = new Rectangle(-options.width * 0.45, -options.width, options.width * 0.9, options.width);

    const placeholder = new Graphics()
      .poly([
        -options.width * 0.32, -options.width * 0.24,
        0, -options.width * 0.42,
        options.width * 0.32, -options.width * 0.24,
        0, -options.width * 0.06
      ])
      .fill({ color: options.placeholderColor, alpha: 0.2 });
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
      slot.addChild(this.makeSprite(texture, options.width, options.anchorY, options.alpha ?? 1));
    });
  }

  private makeSprite(texture: Texture, width: number, anchorY: number, alpha: number): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, anchorY);
    sprite.scale.set(width / Math.max(1, texture.width));
    sprite.alpha = alpha;
    return sprite;
  }
}
