import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  type Texture
} from 'pixi.js';
import type {
  AmbientBlockSceneState,
  CitySceneState,
  FacilitySceneState,
  PlotSceneState,
  ScenePoint
} from '../CitySceneMapper';
import { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { PixiAssetLoader } from './PixiAssetLoader';
import { WorldCamera } from './WorldCamera';
import { WorldInputController } from './WorldInputController';
import { WorldLayerManager } from './WorldLayerManager';
import { ImmersiveRoadGrid, type ImmersiveRoadCell } from './generation/ImmersiveRoadGrid';
import { RoadAutoTiler, RoadDirection } from './generation/RoadAutoTiler';

const SCENE_UNITS_PER_GRID = 10;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;
const ELEVATION_HEIGHT = 11.5;
const ROAD_STEP = 10;
const WORLD_RADIUS = 360;

const buildingAssets = {
  residential: [
    'res_tower_a',
    'res_tower_b',
    'res_slab_a',
    'res_slab_b',
    'res_townhouse',
    'res_oldblock'
  ],
  industrial: ['ind_factory', 'ind_warehouse', 'ind_tankfarm', 'ind_heavy'],
  utility: ['civic_hospital', 'civic_school', 'civic_cityhall', 'civic_transit']
} as const;

const terrainByBlockKind: Record<AmbientBlockSceneState['kind'], string> = {
  residential: 'world_terrain_residential_lot',
  industrial: 'world_terrain_industrial_lot',
  utility: 'world_terrain_civic_lot',
  park: 'world_terrain_park_lot'
};

const toColor = (value: string, fallback = 0x4ad7ff): number => {
  const normalized = value.trim().replace('#', '');
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const seededUnit = (seed: number, salt: number): number => {
  let value = (seed ^ Math.imul(salt + 1, 0x45d9f3b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
};

export class ImmersivePixiWorld implements WorldRenderSurface {
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
    this.host.dataset.worldRenderer = 'immersive';
    void this.initialize().catch((error: unknown) => {
      console.error('Immersive Pixi city renderer failed to initialize:', error);
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
    const city = this.project(this.state.city);
    const startZoom = clamp(
      this.state.camera.startZoom * 1.16,
      this.state.camera.minZoom,
      this.state.camera.maxZoom
    );
    this.camera.configure({
      ...this.state.camera,
      startZoom,
      startOffsetY: this.state.camera.startOffsetY + 30
    });
    this.camera.setPivot(city.x, city.y);
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
      backgroundColor: 0x06131b,
      antialias: true,
      preference: 'webgl',
      powerPreference: 'high-performance'
    });
    if (!this.mounted) {
      this.app.destroy({ removeView: true }, { children: true, context: true });
      return;
    }

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.className = 'hologram-sandbox-canvas pixi-world-canvas immersive-world-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', '全屏城市经营世界，可拖动、缩放和选择设施');
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
    const accent = toColor(state.accent);
    const roads = ImmersiveRoadGrid.fromRoads(state.roads, ROAD_STEP);

    this.drawTerrain(state, accent);
    this.drawDistrictGround(state, accent);
    this.drawRoadTiles(roads, generation);
    this.drawFacilityAccessRoads(state, roads);
    this.drawAmbientBlocks(state, roads, generation);
    this.drawFacilities(state, generation);
    this.drawEnergyLinks(state, accent);
    this.drawPlots(state, accent);
    this.layerManager.sortDynamicLayers();
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

  private diamondPoints(point: ScenePoint, radiusX: number, radiusZ: number): number[] {
    const points = [
      this.project({ ...point, x: point.x - radiusX }),
      this.project({ ...point, z: point.z - radiusZ }),
      this.project({ ...point, x: point.x + radiusX }),
      this.project({ ...point, z: point.z + radiusZ })
    ];
    return points.flatMap(({ x, y }) => [x, y]);
  }

  private drawTerrain(state: CitySceneState, accent: number): void {
    const baseColor = state.theme === 'industrial'
      ? 0x182229
      : state.theme === 'green'
        ? 0x112921
        : 0x10252b;
    const ground = new Graphics()
      .poly(this.diamondPoints(state.city, WORLD_RADIUS, WORLD_RADIUS))
      .fill({ color: baseColor, alpha: 1 });
    ground.zIndex = -1000000;
    this.layerManager.layers.terrain.addChild(ground);

    const grid = new Graphics();
    const lineCount = 18;
    const span = 220;
    for (let index = -lineCount; index <= lineCount; index += 1) {
      const offset = index * 12;
      const a = this.project({ x: -span, z: offset, elevation: -0.6 });
      const b = this.project({ x: span, z: offset, elevation: -0.6 });
      grid.moveTo(a.x, a.y).lineTo(b.x, b.y);
      const c = this.project({ x: offset, z: -span, elevation: -0.6 });
      const d = this.project({ x: offset, z: span, elevation: -0.6 });
      grid.moveTo(c.x, c.y).lineTo(d.x, d.y);
    }
    grid.stroke({ color: accent, alpha: state.placement ? 0.075 : 0.025, width: 1 });
    grid.zIndex = -999999;
    this.layerManager.layers.terrain.addChild(grid);
  }

  private drawDistrictGround(state: CitySceneState, accent: number): void {
    for (const district of state.districts) {
      const lowPower = district.powerRatio < 0.85;
      const color = lowPower ? 0x6f2635 : accent;
      const shape = new Graphics()
        .poly(this.diamondPoints(district, district.radiusX, district.radiusZ))
        .fill({ color, alpha: lowPower ? 0.055 : 0.018 });
      shape.zIndex = this.depth(district, -50);
      this.layerManager.layers.terrain.addChild(shape);
    }
  }

  private drawRoadTiles(roads: ImmersiveRoadGrid, generation: number): void {
    for (const cell of roads.cells) {
      const mask = RoadAutoTiler.calculateMask(cell.gridX, cell.gridY, roads);
      const laneWidth = cell.laneCount === 2 ? 4 : 2;
      const assetId = RoadAutoTiler.getAssetId(mask, laneWidth);
      const point: ScenePoint = {
        x: cell.gridX * roads.step,
        z: cell.gridY * roads.step,
        elevation: -0.28
      };
      const underlay = new Graphics()
        .poly(this.diamondPoints(point, 5.15, 5.15))
        .fill({ color: cell.powered ? 0x253941 : 0x1b2227, alpha: 0.98 });
      underlay.zIndex = this.depth(point, -2);
      this.layerManager.layers.roads.addChild(underlay);
      this.addTileAsset({
        assetId,
        point,
        width: 132,
        generation,
        alpha: cell.powered ? 0.96 : 0.7,
        placeholderColor: cell.powered ? 0x344b54 : 0x252c31
      });
    }
  }

  private drawFacilityAccessRoads(state: CitySceneState, roads: ImmersiveRoadGrid): void {
    for (const facility of state.facilities) {
      const nearest = roads.nearest(facility.x, facility.z);
      if (!nearest) continue;
      const from = this.project({ ...facility, elevation: -0.18 });
      const to = this.project({
        x: nearest.gridX * roads.step,
        z: nearest.gridY * roads.step,
        elevation: -0.18
      });
      const access = new Graphics()
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({ color: 0x2c4049, alpha: 0.95, width: 9, cap: 'round' });
      access.zIndex = this.depth(facility, -5);
      this.layerManager.layers.roads.addChild(access);
    }
  }

  private drawAmbientBlocks(
    state: CitySceneState,
    roads: ImmersiveRoadGrid,
    generation: number
  ): void {
    const suffix = state.blackoutIntensity > 0.45
      ? 'blackout'
      : state.hour < 6 || state.hour >= 18
        ? 'night'
        : 'day';

    for (const block of state.ambientBlocks) {
      const point = this.alignBlockToRoad(block, roads);
      const lotWidth = clamp(92 + Math.max(block.width, block.depth) * 5.2, 108, 148);
      this.addTileAsset({
        assetId: terrainByBlockKind[block.kind],
        point: { ...point, elevation: -0.12 },
        width: lotWidth,
        generation,
        alpha: block.kind === 'park' ? 0.92 : 0.78,
        placeholderColor: block.kind === 'park' ? 0x315d48 : 0x2a3a3f,
        layer: this.layerManager.layers.terrain
      });

      if (block.kind === 'park') {
        this.addPark(point, block);
        continue;
      }

      const pool = buildingAssets[block.kind];
      const selected = pool[Math.abs(block.lightSeed) % pool.length];
      if (!selected) continue;
      const bodyAssetId = `world_building_${selected}_${suffix}`;
      const shadowAssetId = `world_building_${selected}_shadow`;
      const width = clamp(74 + block.width * 7.2 + block.floors * 1.2, 92, 158);

      this.addAssetObject({
        assetId: shadowAssetId,
        point: { ...point, elevation: Math.max(-0.08, point.elevation - 0.35) },
        width,
        anchorY: 0.82,
        generation,
        layer: this.layerManager.layers.buildingShadows,
        alpha: 0.5,
        placeholderColor: 0x000000
      });
      this.addAssetObject({
        assetId: bodyAssetId,
        point,
        width,
        anchorY: 0.82,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: 0.96,
        placeholderColor: block.kind === 'industrial' ? 0xc77c4c : 0x4e9ebb
      });
      this.addStreetDecoration(point, block);
    }
  }

  private alignBlockToRoad(block: AmbientBlockSceneState, roads: ImmersiveRoadGrid): ScenePoint {
    const nearest = roads.nearest(block.x, block.z);
    if (!nearest) return block;
    const mask = RoadAutoTiler.calculateMask(nearest.gridX, nearest.gridY, roads);
    const verticalConnections = Number(Boolean(mask & RoadDirection.North))
      + Number(Boolean(mask & RoadDirection.South));
    const horizontalConnections = Number(Boolean(mask & RoadDirection.East))
      + Number(Boolean(mask & RoadDirection.West));
    const roadRunsVertical = verticalConnections >= horizontalConnections;
    const side = block.lightSeed % 2 === 0 ? 1 : -1;
    const offset = 8.2 + Math.min(2.8, block.width * 0.35);
    const along = (seededUnit(block.lightSeed, 7) - 0.5) * 7;
    return {
      x: nearest.gridX * roads.step + (roadRunsVertical ? side * offset : along),
      z: nearest.gridY * roads.step + (roadRunsVertical ? along : side * offset),
      elevation: block.elevation
    };
  }

  private addPark(point: ScenePoint, block: AmbientBlockSceneState): void {
    const position = this.project({ ...point, elevation: 0.05 });
    const park = new Container();
    park.position.set(position.x, position.y);
    park.zIndex = this.depth(point, 2);
    const treeCount = 3 + Math.abs(block.lightSeed % 3);
    for (let index = 0; index < treeCount; index += 1) {
      const x = (seededUnit(block.lightSeed, index * 2 + 1) - 0.5) * 52;
      const y = (seededUnit(block.lightSeed, index * 2 + 2) - 0.5) * 24;
      const tree = new Graphics()
        .rect(x - 1.5, y, 3, 9)
        .fill({ color: 0x4c3929, alpha: 0.9 })
        .circle(x, y - 3, 7 + seededUnit(block.lightSeed, index + 20) * 3)
        .fill({ color: 0x4f9d70, alpha: 0.96 });
      park.addChild(tree);
    }
    this.layerManager.layers.groundDecorations.addChild(park);
  }

  private addStreetDecoration(point: ScenePoint, block: AmbientBlockSceneState): void {
    const position = this.project({ ...point, elevation: 0.04 });
    const decoration = new Container();
    decoration.position.set(position.x, position.y);
    decoration.zIndex = this.depth(point, 3);
    const side = block.lightSeed % 2 === 0 ? -1 : 1;
    const lamp = new Graphics()
      .rect(side * 36 - 1, -4, 2, 16)
      .fill({ color: 0x7896a3, alpha: 0.8 })
      .circle(side * 36, -7, 3.5)
      .fill({ color: block.powerRatio > 0.5 ? 0xffd97a : 0x657078, alpha: 0.92 });
    decoration.addChild(lamp);
    if (block.kind === 'residential' && seededUnit(block.lightSeed, 32) > 0.35) {
      decoration.addChild(new Graphics()
        .circle(-side * 34, 2, 7)
        .fill({ color: 0x4c8c67, alpha: 0.9 }));
    }
    this.layerManager.layers.groundDecorations.addChild(decoration);
  }

  private drawFacilities(state: CitySceneState, generation: number): void {
    for (const facility of state.facilities) {
      this.addFacilityLot(facility, generation);
      const visual = FacilityVisualRegistry.resolve({
        configId: facility.configId,
        category: facility.category,
        enabled: facility.enabled,
        selected: false,
        constructionProgress: 1
      });
      this.addAssetObject({
        assetId: visual.shadowAssetId,
        point: { ...facility, elevation: Math.max(0, facility.elevation - 0.8) },
        width: 132 * facility.scale,
        anchorY: 0.55,
        generation,
        layer: this.layerManager.layers.buildingShadows,
        alpha: 0.58,
        placeholderColor: 0x000000
      });
      this.addAssetObject({
        assetId: visual.bodyAssetId,
        point: facility,
        width: 150 * facility.scale,
        anchorY: 0.84,
        generation,
        layer: this.layerManager.layers.buildings,
        placeholderColor: 0x78dfff,
        onActivate: () => this.actions.onFacilityClick(facility.instanceId)
      });
      if (visual.lightAssetId && facility.enabled) {
        this.addAssetObject({
          assetId: visual.lightAssetId,
          point: facility,
          width: 112 * facility.scale,
          anchorY: 0.66,
          generation,
          layer: this.layerManager.layers.effects,
          alpha: state.placement ? 0.58 : 0.36,
          placeholderColor: 0x4ad7ff
        });
      }
    }
  }

  private addFacilityLot(facility: FacilitySceneState, generation: number): void {
    const category = String(facility.category);
    const assetId = category === 'storage'
      ? 'world_terrain_utility_lot'
      : category === 'solar' || category === 'wind' || category === 'hydro'
        ? 'world_terrain_grass_clean'
        : 'world_terrain_industrial_lot';
    this.addTileAsset({
      assetId,
      point: { ...facility, elevation: -0.08 },
      width: 144 * facility.scale,
      generation,
      alpha: 0.9,
      placeholderColor: 0x2b3b40,
      layer: this.layerManager.layers.terrain
    });
  }

  private drawEnergyLinks(state: CitySceneState, accent: number): void {
    if (!state.placement && state.blackoutIntensity < 0.26) return;
    const modeAlpha = state.placement ? 0.16 : 0.04 + state.blackoutIntensity * 0.08;
    for (const link of state.links) {
      const from = this.project(link.from);
      const to = this.project(link.to);
      const beam = new Graphics()
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({
          color: link.active ? accent : 0x56636c,
          alpha: modeAlpha * link.intensity,
          width: state.placement ? 2 : 1
        });
      beam.zIndex = this.depth(link.from, 5);
      this.layerManager.layers.effects.addChild(beam);
    }
  }

  private drawPlots(state: CitySceneState, accent: number): void {
    if (!state.placement) return;
    for (const plot of state.plots) {
      if (plot.occupied || plot.locked) continue;
      const color = plot.available ? 0x5ce1a3 : plot.blocked ? 0xff667f : accent;
      const overlay = new Graphics()
        .poly(this.diamondPoints(plot, 4.6 * plot.scale, 4.6 * plot.scale))
        .fill({ color, alpha: plot.available ? 0.16 : 0.045 })
        .stroke({ color, alpha: plot.available ? 0.9 : 0.28, width: plot.available ? 2 : 1 });
      overlay.zIndex = this.depth(plot, 50);
      if (plot.available) {
        overlay.eventMode = 'static';
        overlay.cursor = 'pointer';
        overlay.on('pointertap', () => {
          if (this.input?.canActivateObject()) this.actions.onPlotClick(plot.id);
        });
      }
      this.layerManager.layers.overlays.addChild(overlay);
    }
  }

  private addTileAsset(options: {
    assetId: string;
    point: ScenePoint;
    width: number;
    generation: number;
    placeholderColor: number;
    alpha?: number;
    layer?: Container;
  }): void {
    const layer = options.layer ?? this.layerManager.layers.roads;
    const position = this.project(options.point);
    const slot = new Container();
    slot.position.set(position.x, position.y);
    slot.zIndex = this.depth(options.point);
    const placeholder = new Graphics()
      .poly([
        -options.width * 0.5, 0,
        0, -options.width * 0.25,
        options.width * 0.5, 0,
        0, options.width * 0.25
      ])
      .fill({ color: options.placeholderColor, alpha: 0.72 });
    slot.addChild(placeholder);
    layer.addChild(slot);

    void this.assets.load(options.assetId).then((texture) => {
      if (!texture || !this.mounted || options.generation !== this.renderGeneration || slot.destroyed) return;
      for (const child of slot.removeChildren()) child.destroy();
      slot.addChild(this.makeSprite(texture, options.width, 0.5, options.alpha ?? 1));
    });
  }

  private addAssetObject(options: {
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
      .fill({ color: options.placeholderColor, alpha: 0.24 });
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
    const safeTextureWidth = Math.max(1, texture.width);
    sprite.scale.set(width / safeTextureWidth);
    sprite.alpha = alpha;
    return sprite;
  }
}
