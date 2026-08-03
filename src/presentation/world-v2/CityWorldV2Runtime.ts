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
  FacilitySceneState,
  PlotSceneState,
  ScenePoint
} from '../CitySceneTypes';
import { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';
import {
  resolveDistrictPresentation,
  resolveFacilityPresentation
} from '../pixi/City01BuildingPresentation';
import { PixiAssetLoader } from '../pixi/PixiAssetLoader';
import { WorldCamera } from '../pixi/WorldCamera';
import { WorldInputController } from '../pixi/WorldInputController';
import { WorldLayerManager } from '../pixi/WorldLayerManager';
import type {
  WorldRenderActions,
  WorldRenderSurface
} from '../../ui/world/WorldRenderSurface';
import type {
  WorldV2MapContract,
  WorldV2PlotContract,
  WorldV2ZoneKind
} from './WorldContractsV2';
import {
  WorldV2MapRenderer,
  worldV2FootprintCenter,
  worldV2FootprintCorners,
  worldV2PointToScene
} from './WorldV2MapRenderer';

const GRID = 10;
const TILE_W = 128;
const TILE_H = 64;
const ELEVATION = 11.5;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const districtColor = (district: DistrictPrefabSceneState): number => {
  if (district.status === 'normal') return 0x5ce1a3;
  if (district.status === 'warning') return 0xffd45f;
  if (district.status === 'blackout') return 0xff9b54;
  return 0xff667f;
};

const networkColor = (status: EnergyNetworkEdgeSceneState['status']): number => {
  if (status === 'normal') return 0x49cfe7;
  if (status === 'overload') return 0xffb347;
  if (status === 'offline') return 0xff667f;
  return 0x75878d;
};

const plotColors: Record<WorldV2ZoneKind, number> = {
  residential: 0x78a978,
  commercial: 0x78a6b8,
  industrial: 0x9a8567,
  public: 0x87a5a0,
  old_town: 0xa2866f,
  utility: 0x7d9ea7,
  coastal: 0x67a7b4,
  outskirts: 0x82926e
};

interface AssetHitArea {
  width: number;
  height: number;
  offsetY: number;
}

export class CityWorldV2Runtime implements WorldRenderSurface {
  private readonly app = new Application();
  private readonly layers = new WorldLayerManager();
  private readonly assets = new PixiAssetLoader();
  private camera?: WorldCamera;
  private input?: WorldInputController;
  private resizeObserver?: ResizeObserver;
  private state?: CitySceneState;
  private mounted = false;
  private ready = false;
  private generation = 0;
  private pendingPlotId?: string;
  private placementBuildingId?: string;

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: WorldRenderActions,
    private readonly map: WorldV2MapContract
  ) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.host.dataset.worldRenderer = 'city-world-v2';
    void this.initialize().catch((error: unknown) => {
      console.error('City World V2 failed to initialize:', error);
      this.host.dataset.pixiFailed = 'true';
    });
  }

  destroy(): void {
    this.mounted = false;
    this.ready = false;
    this.generation += 1;
    this.pendingPlotId = undefined;
    this.input?.destroy();
    this.resizeObserver?.disconnect();
    this.layers.clear();
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
    const placementId = next.placement?.buildingId;
    if (placementId !== this.placementBuildingId) this.pendingPlotId = undefined;
    this.placementBuildingId = placementId;
    this.state = next;
    if (!this.ready) return;
    this.renderScene(next);
    if (levelChanged) this.focusHome();
  }

  focusHome(): void {
    if (!this.camera) return;
    const mapCenter = worldV2PointToScene(this.map, {
      x: this.map.columns * 0.54,
      z: this.map.rows * 0.48,
      elevation: 0
    });
    const focus = this.project(mapCenter);
    this.camera.configure(this.state?.camera ?? {
      startZoom: 1,
      minZoom: 0.55,
      maxZoom: 2.4,
      startOffsetX: 0,
      startOffsetY: 18,
      panLimitX: 520,
      panLimitY: 360
    });
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
      backgroundColor: 0x123641,
      antialias: true,
      preference: 'webgl',
      powerPreference: 'high-performance'
    });
    if (!this.mounted) {
      this.app.destroy({ removeView: true }, { children: true, context: true });
      return;
    }

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.className = 'hologram-sandbox-canvas pixi-world-canvas city-world-v2-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', '曙光新城 World V2 地图，可拖动、缩放和选择建设用地');
    this.host.replaceChildren(canvas);
    this.app.stage.addChild(this.layers.root);
    this.camera = new WorldCamera(this.layers.root);
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
    const generation = ++this.generation;
    this.layers.clear();
    const diagnostics = state.presentationMode === 'grid';
    this.host.dataset.presentationMode = diagnostics ? 'grid' : 'game';
    this.host.dataset.mapArchitecture = 'world-v2';
    this.host.dataset.buildingPresentation = 'world-v2-migration';

    WorldV2MapRenderer.render({
      map: this.map,
      layers: this.layers.layers,
      project: (point) => this.project(point),
      diagnostics
    });
    this.drawPlotDriveways();
    this.drawPlots(state);
    if (diagnostics) this.drawNetwork(state);
    this.drawDistricts(state, generation, diagnostics);
    this.drawFacilities(state, generation);

    for (const layer of Object.values(this.layers.layers)) layer.sortChildren();
  }

  private project(point: ScenePoint): { x: number; y: number } {
    const x = point.x / GRID;
    const z = point.z / GRID;
    return {
      x: (x - z) * TILE_W * 0.5,
      y: (x + z) * TILE_H * 0.5 - point.elevation * ELEVATION
    };
  }

  private depth(point: ScenePoint, offset = 0): number {
    return Math.round((point.x + point.z) * 1000 + point.elevation * 100 + offset);
  }

  private trace(graphics: Graphics, points: readonly ScenePoint[]): void {
    const first = points[0];
    if (!first) return;
    const start = this.project(first);
    graphics.moveTo(start.x, start.y);
    for (const point of points.slice(1)) {
      const target = this.project(point);
      graphics.lineTo(target.x, target.y);
    }
  }

  private plotCenter(plotId: string): ScenePoint | undefined {
    const contract = this.map.plots.find((plot) => plot.id === plotId);
    return contract ? worldV2FootprintCenter(this.map, contract.footprint) : undefined;
  }

  private entrancePoint(plot: WorldV2PlotContract): { x: number; z: number } {
    const { origin, columns, rows } = plot.footprint;
    const offset = clamp(plot.roadEntrance.offset, 0, 1);
    if (plot.roadEntrance.edge === 'north') {
      return { x: origin.x + columns * offset, z: origin.z };
    }
    if (plot.roadEntrance.edge === 'south') {
      return { x: origin.x + columns * offset, z: origin.z + rows };
    }
    if (plot.roadEntrance.edge === 'west') {
      return { x: origin.x, z: origin.z + rows * offset };
    }
    return { x: origin.x + columns, z: origin.z + rows * offset };
  }

  private drawPlotDriveways(): void {
    for (const plot of this.map.plots) {
      const road = this.map.roads.find((candidate) => candidate.id === plot.roadEntrance.roadId);
      if (!road) continue;
      const entrance = this.entrancePoint(plot);
      let nearest = road.points[0];
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const point of road.points) {
        const distance = Math.hypot(point.x - entrance.x, point.z - entrance.z);
        if (distance < nearestDistance) {
          nearest = point;
          nearestDistance = distance;
        }
      }
      if (!nearest || nearestDistance > 8) continue;
      const points = [
        worldV2PointToScene(this.map, { ...entrance, elevation: 0.05 }),
        worldV2PointToScene(this.map, { ...nearest, elevation: 0.05 })
      ];
      const curb = new Graphics();
      this.trace(curb, points);
      curb.stroke({ color: 0xbab3a2, alpha: 0.76, width: 9, cap: 'round' });
      curb.zIndex = 2400;
      const asphalt = new Graphics();
      this.trace(asphalt, points);
      asphalt.stroke({ color: 0x465052, alpha: 0.95, width: 5, cap: 'round' });
      asphalt.zIndex = 2401;
      this.layers.layers.roads.addChild(curb, asphalt);
    }
  }

  private drawPlots(state: CitySceneState): void {
    const stateById = new Map(state.plots.map((plot) => [plot.id, plot]));
    const placing = Boolean(state.placement);
    for (const contract of this.map.plots) {
      const plot = stateById.get(contract.id);
      if (!plot) continue;
      const corners = worldV2FootprintCorners(this.map, contract.footprint);
      const polygon = corners.flatMap((corner) => {
        const projected = this.project(corner);
        return [projected.x, projected.y];
      });
      const pending = this.pendingPlotId === plot.id;
      const toneColor = plot.placementTone === 'invalid'
        ? 0xff667f
        : plot.placementTone === 'warning'
          ? 0xffd45f
          : 0x5ce1a3;
      const color = placing ? toneColor : plotColors[contract.zone];
      const alpha = placing
        ? plot.available ? pending ? 0.3 : 0.2 : 0.08
        : plot.occupied ? 0.018 : 0.055;
      const outlineAlpha = placing
        ? plot.available ? pending ? 1 : 0.68 : 0.24
        : plot.occupied ? 0.08 : 0.2;
      const ground = new Graphics().poly(polygon)
        .fill({ color, alpha })
        .stroke({ color, alpha: outlineAlpha, width: pending ? 2.2 : 1.1 });
      ground.zIndex = this.depth(worldV2FootprintCenter(this.map, contract.footprint), -120);

      if (placing && plot.available) {
        ground.eventMode = 'static';
        ground.cursor = 'pointer';
        ground.on('pointertap', () => {
          if (this.input?.canActivateObject()) this.activatePlot(plot.id);
        });
      }
      this.layers.layers.groundDecorations.addChild(ground);

      if (pending) this.drawPendingPlotLabel(plot, contract);
    }
  }

  private drawPendingPlotLabel(plot: PlotSceneState, contract: WorldV2PlotContract): void {
    const center = worldV2FootprintCenter(this.map, contract.footprint);
    const position = this.project({ ...center, elevation: center.elevation + 2.5 });
    const container = new Container();
    container.position.set(position.x, position.y - 34);
    container.zIndex = this.depth(center, 500);
    const panel = new Graphics().roundRect(-68, -14, 136, 28, 8)
      .fill({ color: 0x071b22, alpha: 0.94 })
      .stroke({ color: 0x5ce1a3, alpha: 0.9, width: 1 });
    const label = new Text({
      text: `再次点击建设 · ${plot.label}`,
      style: {
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        fontWeight: '700',
        fill: 0xffffff
      }
    });
    label.anchor.set(0.5);
    container.addChild(panel, label);
    this.layers.layers.overlays.addChild(container);
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

  private drawDistricts(
    state: CitySceneState,
    generation: number,
    diagnostics: boolean
  ): void {
    for (const district of state.districtPrefabs ?? []) {
      if (!district.prefabAssetId) continue;
      const presentation = resolveDistrictPresentation(district);
      const point = { ...district, elevation: district.elevation + presentation.elevationOffset };
      this.drawShadow(point, presentation.width * 0.64, presentation.width * 0.18);
      const suffix = district.status === 'blackout' || district.status === 'offline'
        ? 'blackout'
        : 'night';
      this.addAsset({
        assetId: `${district.prefabAssetId}_${suffix}`,
        point,
        width: presentation.width * 0.88,
        anchorY: presentation.anchorY,
        generation,
        layer: this.layers.layers.buildings,
        alpha: district.status === 'offline' ? 0.68 : 0.95,
        toneTint: presentation.toneTint,
        placeholderColor: districtColor(district)
      });
      if (diagnostics) this.drawDistrictLabel(district);
    }
  }

  private drawDistrictLabel(district: DistrictPrefabSceneState): void {
    const position = this.project({ ...district, elevation: district.elevation + 3 });
    const label = new Text({
      text: `${district.label} ${Math.round(district.powerRatio * 100)}%`,
      style: {
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        fontWeight: '600',
        fill: 0xf2fbff
      }
    });
    label.anchor.set(0.5);
    const panel = new Graphics().roundRect(-58, -12, 116, 24, 7)
      .fill({ color: 0x071b22, alpha: 0.88 })
      .stroke({ color: districtColor(district), alpha: 0.72, width: 1 });
    const container = new Container();
    container.position.set(position.x, position.y - 50);
    container.zIndex = this.depth(district, 420);
    container.addChild(panel, label);
    this.layers.layers.overlays.addChild(container);
  }

  private facilityPoint(facility: FacilitySceneState): ScenePoint {
    const center = this.plotCenter(facility.plotId);
    if (!center) return facility;
    return {
      ...center,
      elevation: center.elevation + 1.1
    };
  }

  private drawFacilities(state: CitySceneState, generation: number): void {
    for (const facility of state.facilities) {
      const visual = FacilityVisualRegistry.resolve({
        configId: facility.configId,
        category: facility.category,
        enabled: facility.enabled,
        selected: false,
        constructionProgress: facility.constructionProgress,
        presentation: 'commercial'
      });
      const presentation = resolveFacilityPresentation(facility);
      const point = this.facilityPoint(facility);
      const active = facility.enabled && !facility.underConstruction;
      this.drawShadow(point, presentation.width * 0.46, presentation.width * 0.13);
      this.addAsset({
        assetId: visual.bodyAssetId,
        point: { ...point, elevation: point.elevation + presentation.elevationOffset },
        width: presentation.width,
        anchorY: presentation.anchorY,
        generation,
        layer: this.layers.layers.buildings,
        alpha: facility.underConstruction ? 0.9 : active ? 1 : 0.66,
        toneTint: presentation.toneTint,
        hitArea: {
          width: presentation.width * presentation.hitWidthFactor,
          height: presentation.width * presentation.hitHeightFactor,
          offsetY: presentation.width * presentation.hitOffsetYFactor
        },
        placeholderColor: facility.underConstruction ? 0xffd45f : active ? 0x78dfff : 0xff667f,
        onActivate: () => this.actions.onFacilityClick(facility.instanceId)
      });
      if (facility.underConstruction) this.drawConstructionStatus(facility, point);
    }
  }

  private drawShadow(point: ScenePoint, width: number, height: number): void {
    const position = this.project({ ...point, elevation: point.elevation - 0.12 });
    const shadow = new Graphics().ellipse(
      position.x + 8,
      position.y + 10,
      Math.max(12, width * 0.5),
      Math.max(6, height * 0.5)
    ).fill({ color: 0x06110f, alpha: 0.16 });
    shadow.zIndex = this.depth(point, -220);
    this.layers.layers.buildingShadows.addChild(shadow);
  }

  private drawConstructionStatus(facility: FacilitySceneState, point: ScenePoint): void {
    const position = this.project({ ...point, elevation: point.elevation + 3.2 });
    const progress = clamp(facility.constructionProgress, 0, 1);
    const container = new Container();
    container.position.set(position.x, position.y - 34);
    container.zIndex = this.depth(point, 520);
    const panel = new Graphics().roundRect(-46, -14, 92, 28, 8)
      .fill({ color: 0x071b22, alpha: 0.94 })
      .stroke({ color: 0xffd45f, alpha: 0.88, width: 1 })
      .roundRect(-36, 5, 72, 4, 2).fill({ color: 0x28363a, alpha: 1 })
      .roundRect(-36, 5, 72 * progress, 4, 2).fill({ color: 0xffd45f, alpha: 1 });
    const label = new Text({
      text: `施工 ${Math.round(progress * 100)}%`,
      style: {
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        fontWeight: '700',
        fill: 0xfff3c4
      }
    });
    label.anchor.set(0.5);
    label.position.set(0, -3);
    container.addChild(panel, label);
    this.layers.layers.overlays.addChild(container);
  }

  private drawNetwork(state: CitySceneState): void {
    for (const [index, edge] of (state.networkEdges ?? []).entries()) {
      if (edge.points.length < 2) continue;
      const color = networkColor(edge.status);
      const glow = new Graphics();
      this.trace(glow, edge.points);
      glow.stroke({ color, alpha: 0.18, width: 8, cap: 'round', join: 'round' });
      glow.zIndex = 5000 + index * 2;
      const line = new Graphics();
      this.trace(line, edge.points);
      line.stroke({ color, alpha: 0.78, width: 2, cap: 'round', join: 'round' });
      line.zIndex = 5001 + index * 2;
      this.layers.layers.effects.addChild(glow, line);
    }

    for (const node of state.networkNodes ?? []) {
      if (node.kind === 'district') continue;
      const position = this.project(node);
      const color = node.status === 'offline'
        ? 0xff667f
        : node.status === 'warning'
          ? 0xffb347
          : 0x55ddff;
      const marker = new Graphics().circle(position.x, position.y, node.kind === 'substation' ? 10 : 7)
        .fill({ color: 0x071b22, alpha: 0.88 })
        .stroke({ color, alpha: 0.92, width: 2 })
        .circle(position.x, position.y, 2.5)
        .fill({ color, alpha: 1 });
      marker.zIndex = this.depth(node, 580);
      this.layers.layers.effects.addChild(marker);
    }
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
    toneTint?: number;
    hitArea?: AssetHitArea;
    zIndexOverride?: number;
    onActivate?: () => void;
  }): void {
    const position = this.project(options.point);
    const slot = new Container();
    slot.position.set(position.x, position.y);
    slot.zIndex = options.zIndexOverride ?? this.depth(options.point);
    const hitWidth = options.hitArea?.width ?? options.width * 0.9;
    const hitHeight = options.hitArea?.height ?? options.width;
    const hitOffsetY = options.hitArea?.offsetY ?? 0;
    slot.hitArea = new Rectangle(
      -hitWidth * 0.5,
      -hitHeight + hitOffsetY,
      hitWidth,
      hitHeight
    );
    const placeholder = new Graphics().poly([
      -options.width * 0.3, -options.width * 0.22,
      0, -options.width * 0.4,
      options.width * 0.3, -options.width * 0.22,
      0, -options.width * 0.05
    ]).fill({ color: options.placeholderColor, alpha: 0.14 });
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
      if (!texture || !this.mounted || options.generation !== this.generation || slot.destroyed) return;
      for (const child of slot.removeChildren()) child.destroy();
      slot.addChild(this.makeSprite(
        texture,
        options.width,
        options.anchorY,
        options.alpha ?? 1,
        options.toneTint ?? 0xffffff
      ));
    });
  }

  private makeSprite(
    texture: Texture,
    width: number,
    anchorY: number,
    alpha: number,
    toneTint: number
  ): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, anchorY);
    const scale = width / Math.max(1, texture.width);
    sprite.scale.set(scale);
    sprite.alpha = alpha;
    sprite.tint = toneTint;
    return sprite;
  }
}
