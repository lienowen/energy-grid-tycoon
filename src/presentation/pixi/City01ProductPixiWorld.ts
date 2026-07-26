import {
  Application,
  Container,
  Graphics,
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
} from '../CitySceneMapper';
import { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { PixiAssetLoader } from './PixiAssetLoader';
import { WorldCamera } from './WorldCamera';
import { WorldInputController } from './WorldInputController';
import { WorldLayerManager } from './WorldLayerManager';
import {
  city01CrewMarkers,
  city01DistrictAssetIds,
  city01EnvironmentPlacements,
  city01FacilityAssetFor,
  city01VehicleDefinitions,
  type ProductAssetLayer,
  type ProductVehicleDefinition
} from './City01ProductAssetPlan';

const SCENE_UNITS_PER_GRID = 10;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;
const ELEVATION_HEIGHT = 11.5;

const CITY_ISLAND_OUTER: readonly ScenePoint[] = [
  { x: 13, z: 19, elevation: -0.16 },
  { x: 42, z: 5, elevation: -0.16 },
  { x: 78, z: 6, elevation: -0.16 },
  { x: 103, z: 27, elevation: -0.16 },
  { x: 101, z: 67, elevation: -0.16 },
  { x: 78, z: 91, elevation: -0.16 },
  { x: 39, z: 94, elevation: -0.16 },
  { x: 13, z: 73, elevation: -0.16 },
  { x: 7, z: 46, elevation: -0.16 }
];

const CITY_ISLAND_INNER: readonly ScenePoint[] = [
  { x: 16, z: 21, elevation: -0.08 },
  { x: 43, z: 9, elevation: -0.08 },
  { x: 76, z: 10, elevation: -0.08 },
  { x: 98, z: 29, elevation: -0.08 },
  { x: 96, z: 64, elevation: -0.08 },
  { x: 75, z: 86, elevation: -0.08 },
  { x: 42, z: 88, elevation: -0.08 },
  { x: 18, z: 70, elevation: -0.08 },
  { x: 12, z: 46, elevation: -0.08 }
];

interface AnimatedProductVehicle {
  container: Container;
  sprite: Sprite;
  baseTexture: Texture;
  mirroredTexture: Texture;
  path: readonly { x: number; y: number }[];
  segmentLengths: readonly number[];
  totalLength: number;
  progress: number;
  speed: number;
}

interface AssetSpriteOptions {
  assetId: string;
  point: ScenePoint;
  width: number;
  anchorY: number;
  generation: number;
  layer: Container;
  alpha?: number;
  tint?: number;
  zOffset?: number;
  placeholderColor?: number;
  onActivate?: () => void;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const districtTint = (district: DistrictPrefabSceneState): number => {
  if (district.status === 'normal') return 0xffffff;
  if (district.status === 'warning') return 0xffe1a8;
  if (district.status === 'blackout') return 0xb9a69e;
  return 0x747b82;
};

const districtStatusColor = (district: DistrictPrefabSceneState): number => {
  if (district.status === 'normal') return 0x5ce1a3;
  if (district.status === 'warning') return 0xffd45f;
  if (district.status === 'blackout') return 0xff9b54;
  return 0xff667f;
};

const districtGroundColor = (district: DistrictPrefabSceneState): number => {
  if (district.kind === 'residential') return 0x678c67;
  if (district.kind === 'commercial') return 0x617c83;
  if (district.kind === 'industrial') return 0x756b57;
  if (district.kind === 'public') return 0x668771;
  return 0x806f5d;
};

const networkEdgeColor = (edge: EnergyNetworkEdgeSceneState): number => {
  if (edge.status === 'normal') return 0x45cfff;
  if (edge.status === 'overload') return 0xffb347;
  if (edge.status === 'offline') return 0xff5b68;
  return 0x71858d;
};

const networkNodeColor = (node: EnergyNetworkNodeSceneState): number => {
  if (node.status === 'active') return 0x55ddff;
  if (node.status === 'warning') return 0xffc45f;
  if (node.status === 'offline') return 0xff667f;
  return 0x71858d;
};

const facilityWidth = (facility: FacilitySceneState): number => {
  if (facility.configId.includes('solar')) return 126 * facility.scale;
  if (facility.configId.includes('wind')) return 142 * facility.scale;
  if (facility.configId.includes('gas')) return 132 * facility.scale;
  if (facility.configId.includes('battery') || facility.configId.includes('storage')) {
    return 120 * facility.scale;
  }
  return 118 * facility.scale;
};

export class City01ProductPixiWorld implements WorldRenderSurface {
  private readonly app = new Application();
  private readonly layerManager = new WorldLayerManager();
  private readonly assets = new PixiAssetLoader();
  private readonly loadedAssetIds = new Set<string>();
  private readonly movingVehicles: AnimatedProductVehicle[] = [];
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
    this.host.dataset.worldRenderer = 'city01-product';
    void this.initialize().catch((error: unknown) => {
      console.error('City-01 product renderer failed to initialize:', error);
      this.host.dataset.pixiFailed = 'true';
    });
  }

  destroy(): void {
    this.mounted = false;
    this.ready = false;
    this.renderGeneration += 1;
    this.movingVehicles.length = 0;
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
    delete this.host.dataset.productAssetsLoaded;
    delete this.host.dataset.productAssetCount;
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
      backgroundColor: 0x082937,
      antialias: true,
      preference: 'webgl',
      powerPreference: 'high-performance'
    });
    if (!this.mounted) {
      this.app.destroy({ removeView: true }, { children: true, context: true });
      return;
    }

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.className = 'hologram-sandbox-canvas pixi-world-canvas city01-product-world-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'City-01 连续海岸城市，可拖动、缩放和操作设施');
    this.host.replaceChildren(canvas);
    this.app.stage.addChild(this.layerManager.root);
    this.app.ticker.add((ticker) => this.animateVehicles(ticker.deltaTime));

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
    this.movingVehicles.length = 0;
    this.loadedAssetIds.clear();
    this.updateLoadedAssetDataset();
    this.layerManager.clear();

    this.drawWorldBase(state);
    this.drawCommittedEnvironment(generation);
    this.drawRoadNetwork(state.roads);
    this.drawDistricts(state, generation);
    this.drawFacilities(state, generation);
    this.drawEnergyNetwork(state, generation);
    if (state.presentationMode !== 'grid') this.drawVehicles(generation);
    this.drawCrew(generation, state.presentationMode === 'grid');
    this.drawPlots(state.plots, state.placement, generation);
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

  private polygonPoints(points: readonly ScenePoint[]): number[] {
    return points.flatMap((point) => {
      const projected = this.project(point);
      return [projected.x, projected.y];
    });
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

  private drawWorldBase(state: CitySceneState): void {
    const center = state.focus ?? state.city;
    const water = new Graphics()
      .poly(this.diamondPoints(center, 138, 132))
      .fill({ color: 0x0b5067, alpha: 1 });
    water.zIndex = -1200000;
    this.layerManager.layers.terrain.addChild(water);

    const waterBands = [0, 1, 2, 3].map((index) => {
      const band = new Graphics()
        .poly(this.diamondPoints(
          { ...center, elevation: -0.4 - index * 0.04 },
          126 - index * 4,
          120 - index * 4
        ))
        .stroke({ color: 0x5db7c9, alpha: 0.08 - index * 0.012, width: 2 });
      band.zIndex = -1199900 + index;
      return band;
    });
    this.layerManager.layers.terrain.addChild(...waterBands);

    const beach = new Graphics()
      .poly(this.polygonPoints(CITY_ISLAND_OUTER))
      .fill({ color: 0xc1aa72, alpha: 1 })
      .stroke({ color: 0xe5d29c, alpha: 0.42, width: 2 });
    beach.zIndex = -1100000;
    this.layerManager.layers.terrain.addChild(beach);

    const island = new Graphics()
      .poly(this.polygonPoints(CITY_ISLAND_INNER))
      .fill({ color: 0x426f54, alpha: 1 })
      .stroke({ color: 0x82aa85, alpha: 0.28, width: 2 });
    island.zIndex = -1099900;
    this.layerManager.layers.terrain.addChild(island);

    const innerField = new Graphics()
      .poly(this.diamondPoints({ x: 55, z: 49, elevation: -0.06 }, 39, 34))
      .fill({ color: 0x55785d, alpha: 0.34 });
    innerField.zIndex = -1099800;
    this.layerManager.layers.terrain.addChild(innerField);
  }

  private drawCommittedEnvironment(generation: number): void {
    for (const placement of city01EnvironmentPlacements) {
      this.addAssetSprite({
        assetId: placement.assetId,
        point: placement.point,
        width: placement.width,
        anchorY: placement.anchorY ?? 0.9115,
        generation,
        layer: this.layerFor(placement.layer),
        alpha: placement.alpha ?? 1,
        zOffset: placement.zOffset ?? 0,
        placeholderColor: placement.layer === 'roads' ? 0x35454a : 0x2d6048
      });
    }
  }

  private layerFor(layer: ProductAssetLayer): Container {
    if (layer === 'roads') return this.layerManager.layers.roads;
    if (layer === 'groundDecorations') return this.layerManager.layers.groundDecorations;
    return this.layerManager.layers.terrain;
  }

  private drawRoadNetwork(roads: readonly RoadSceneState[]): void {
    for (const road of roads) {
      if (road.points.length < 2) continue;
      const projected = road.points.map((point) => this.project({ ...point, elevation: -0.02 }));
      const first = projected[0];
      if (!first) continue;
      const depth = this.depth(road.points[0]!, -460);
      const sidewalkWidth = road.laneCount === 2 ? 20 : 14;
      const asphaltWidth = road.laneCount === 2 ? 14 : 9;

      const sidewalk = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) sidewalk.lineTo(point.x, point.y);
      sidewalk.stroke({
        color: 0xb0b39a,
        alpha: 0.78,
        width: sidewalkWidth,
        cap: 'round',
        join: 'round'
      });
      sidewalk.zIndex = depth;
      this.layerManager.layers.roads.addChild(sidewalk);

      const asphalt = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) asphalt.lineTo(point.x, point.y);
      asphalt.stroke({
        color: 0x30373b,
        alpha: 0.98,
        width: asphaltWidth,
        cap: 'round',
        join: 'round'
      });
      asphalt.zIndex = depth + 1;
      this.layerManager.layers.roads.addChild(asphalt);

      const edge = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) edge.lineTo(point.x, point.y);
      edge.stroke({
        color: road.powered ? 0xf1d36f : 0x8b9294,
        alpha: road.laneCount === 2 ? 0.52 : 0.24,
        width: 1,
        cap: 'round',
        join: 'round'
      });
      edge.zIndex = depth + 2;
      this.layerManager.layers.roads.addChild(edge);

      if (road.laneCount === 2) this.drawDashedRoadCenter(projected, depth + 3);
    }
  }

  private drawDashedRoadCenter(points: readonly { x: number; y: number }[], zIndex: number): void {
    const graphics = new Graphics();
    const dash = 7;
    const gap = 6;
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index]!;
      const to = points[index + 1]!;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length <= 0) continue;
      const dx = (to.x - from.x) / length;
      const dy = (to.y - from.y) / length;
      for (let offset = 0; offset < length; offset += dash + gap) {
        const end = Math.min(length, offset + dash);
        graphics
          .moveTo(from.x + dx * offset, from.y + dy * offset)
          .lineTo(from.x + dx * end, from.y + dy * end);
      }
    }
    graphics.stroke({ color: 0xe6d9a4, alpha: 0.66, width: 1.2, cap: 'round' });
    graphics.zIndex = zIndex;
    this.layerManager.layers.roads.addChild(graphics);
  }

  private drawDistricts(state: CitySceneState, generation: number): void {
    for (const district of state.districtPrefabs ?? []) {
      this.drawDistrictPad(district);
      const width = district.width * 6.5 * district.scale;
      this.addAssetSprite({
        assetId: city01DistrictAssetIds[district.kind],
        point: { ...district, elevation: district.elevation + 0.28 },
        width,
        anchorY: 0.9115,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: district.status === 'offline' ? 0.7 : 1,
        tint: districtTint(district),
        placeholderColor: districtStatusColor(district)
      });

      if (district.status !== 'normal') this.drawDistrictWarning(district);
      if (state.presentationMode === 'grid') this.drawDistrictLabel(district);
    }
  }

  private drawDistrictPad(district: DistrictPrefabSceneState): void {
    const radiusX = district.width * 0.53;
    const radiusZ = district.depth * 0.62;
    const base = new Graphics()
      .poly(this.diamondPoints({ ...district, elevation: -0.02 }, radiusX, radiusZ))
      .fill({ color: districtGroundColor(district), alpha: 0.98 })
      .stroke({ color: 0xd4d8bd, alpha: 0.58, width: 2 });
    base.zIndex = this.depth(district, -180);
    this.layerManager.layers.groundDecorations.addChild(base);

    const inset = new Graphics()
      .poly(this.diamondPoints({ ...district, elevation: -0.01 }, radiusX * 0.84, radiusZ * 0.82))
      .fill({ color: 0x1f3128, alpha: 0.13 })
      .stroke({ color: 0xffffff, alpha: 0.08, width: 1 });
    inset.zIndex = this.depth(district, -170);
    this.layerManager.layers.groundDecorations.addChild(inset);
  }

  private drawDistrictWarning(district: DistrictPrefabSceneState): void {
    const position = this.project({ ...district, elevation: 1.25 });
    const color = districtStatusColor(district);
    const halo = new Graphics()
      .circle(position.x, position.y - 24, 12)
      .fill({ color, alpha: 0.12 })
      .stroke({ color, alpha: 0.72, width: 2 });
    halo.zIndex = this.depth(district, 260);
    this.layerManager.layers.effects.addChild(halo);
  }

  private drawDistrictLabel(district: DistrictPrefabSceneState): void {
    const position = this.project({ ...district, elevation: 2.1 });
    const color = districtStatusColor(district);
    const value = `${district.label} · ${Math.round(district.powerRatio * 100)}%`;
    this.drawLabel(value, position.x, position.y - 38, color, this.depth(district, 340));
  }

  private drawFacilities(state: CitySceneState, generation: number): void {
    for (const facility of state.facilities) {
      const directAssetId = city01FacilityAssetFor(facility.configId);
      const fallbackVisual = directAssetId
        ? undefined
        : FacilityVisualRegistry.resolve({
          configId: facility.configId,
          category: facility.category,
          enabled: facility.enabled,
          selected: false,
          constructionProgress: 1
        });
      const assetId = directAssetId ?? fallbackVisual?.bodyAssetId;
      if (!assetId) continue;
      const width = facilityWidth(facility);
      this.drawFacilityPad(facility, width);
      this.addAssetSprite({
        assetId,
        point: { ...facility, elevation: facility.elevation + 0.2 },
        width,
        anchorY: directAssetId ? 0.9115 : 0.84,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: facility.enabled ? 1 : 0.62,
        tint: facility.enabled ? 0xffffff : 0x7d858a,
        placeholderColor: facility.enabled ? 0x78dfff : 0x7c858a,
        onActivate: () => this.actions.onFacilityClick(facility.instanceId)
      });
    }
  }

  private drawFacilityPad(facility: FacilitySceneState, width: number): void {
    const radius = clamp(width / 18, 6, 10);
    const color = facility.category === 'storage' ? 0x4d6f70 : 0x5e684c;
    const pad = new Graphics()
      .poly(this.diamondPoints({ ...facility, elevation: -0.01 }, radius * 1.3, radius))
      .fill({ color, alpha: 0.95 })
      .stroke({ color: 0xd3d2b5, alpha: 0.48, width: 1.5 });
    pad.zIndex = this.depth(facility, -145);
    this.layerManager.layers.groundDecorations.addChild(pad);
  }

  private drawEnergyNetwork(state: CitySceneState, generation: number): void {
    if (state.presentationMode === 'grid') this.drawDiagnosticWash(state);

    for (const edge of state.networkEdges ?? []) {
      if (edge.points.length < 2) continue;
      const projected = edge.points.map((point) => this.project(point));
      const first = projected[0];
      if (!first) continue;
      const color = networkEdgeColor(edge);
      const glow = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) glow.lineTo(point.x, point.y);
      glow.stroke({
        color,
        alpha: 0.22,
        width: 7 + clamp(edge.loadRatio, 0, 1.4) * 2,
        cap: 'round',
        join: 'round'
      });
      glow.zIndex = this.depth(edge.points[0]!, -20);
      this.layerManager.layers.effects.addChild(glow);

      const line = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) line.lineTo(point.x, point.y);
      line.stroke({
        color,
        alpha: edge.status === 'offline' ? 0.78 : 0.94,
        width: 1.8 + clamp(edge.loadRatio, 0, 1.4) * 1.5,
        cap: 'round',
        join: 'round'
      });
      line.zIndex = this.depth(edge.points[0]!, -19);
      this.layerManager.layers.effects.addChild(line);

      if (state.presentationMode === 'grid' && (edge.status !== 'normal' || edge.loadRatio >= 0.82)) {
        const middle = projected[Math.floor(projected.length / 2)];
        if (middle) {
          this.drawLabel(
            edge.status === 'offline' ? '线路故障' : `${Math.round(edge.loadRatio * 100)}%`,
            middle.x,
            middle.y - 14,
            color,
            this.depth(edge.points[0]!, 350)
          );
        }
      }
    }

    for (const node of state.networkNodes ?? []) {
      if (node.kind !== 'substation' && node.kind !== 'distribution') continue;
      const assetId = node.kind === 'substation'
        ? 'facility_main_substation_base'
        : 'facility_distribution_node_base';
      const width = node.kind === 'substation' ? 122 : 76;
      const pad = new Graphics()
        .poly(this.diamondPoints({ ...node, elevation: -0.01 }, node.kind === 'substation' ? 8 : 5.4, node.kind === 'substation' ? 6 : 4.2))
        .fill({ color: 0x405d62, alpha: 0.96 })
        .stroke({ color: networkNodeColor(node), alpha: 0.5, width: 1.5 });
      pad.zIndex = this.depth(node, -120);
      this.layerManager.layers.groundDecorations.addChild(pad);

      this.addAssetSprite({
        assetId,
        point: { ...node, elevation: node.elevation + 0.25 },
        width,
        anchorY: 0.9115,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: node.status === 'offline' ? 0.64 : 1,
        tint: node.status === 'offline' ? 0x777d82 : 0xffffff,
        placeholderColor: networkNodeColor(node)
      });
      if (state.presentationMode === 'grid') this.drawNetworkNodeLabel(node);
    }
  }

  private drawDiagnosticWash(state: CitySceneState): void {
    const wash = new Graphics()
      .poly(this.polygonPoints(CITY_ISLAND_OUTER))
      .fill({ color: 0x03131c, alpha: 0.5 });
    wash.zIndex = -900000;
    this.layerManager.layers.effects.addChild(wash);

    const titlePoint = this.project({ ...(state.focus ?? state.city), elevation: 2 });
    this.drawLabel('电网诊断', titlePoint.x, titlePoint.y - 185, 0x55ddff, 900000);
  }

  private drawNetworkNodeLabel(node: EnergyNetworkNodeSceneState): void {
    const position = this.project({ ...node, elevation: 1.6 });
    const color = networkNodeColor(node);
    const offset = node.id === 'west-distribution'
      ? { x: -48, y: 26 }
      : node.id === 'east-distribution'
        ? { x: 48, y: 26 }
        : { x: 0, y: -32 };
    this.drawLabel(
      `${node.label} · ${Math.round(node.loadRatio * 100)}%`,
      position.x + offset.x,
      position.y + offset.y,
      color,
      this.depth(node, 390)
    );
  }

  private drawCrew(generation: number, diagnostics: boolean): void {
    if (!diagnostics) return;
    for (const marker of city01CrewMarkers.filter((candidate) => candidate.worldVisible)) {
      this.addAssetSprite({
        assetId: marker.iconAssetId,
        point: marker.point,
        width: 30,
        anchorY: 1,
        generation,
        layer: this.layerManager.layers.overlays,
        alpha: 0.96,
        zOffset: 430,
        placeholderColor: 0x5ce1a3
      });
    }
  }

  private drawVehicles(generation: number): void {
    for (const definition of city01VehicleDefinitions) this.addVehicle(definition, generation);
  }

  private addVehicle(definition: ProductVehicleDefinition, generation: number): void {
    const projectedPath = definition.path.map((point) => this.project(point));
    if (projectedPath.length < 2) return;
    const segmentLengths = projectedPath.slice(0, -1).map((from, index) => {
      const to = projectedPath[index + 1]!;
      return Math.hypot(to.x - from.x, to.y - from.y);
    });
    const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
    if (totalLength <= 0) return;

    const holder = new Container();
    holder.label = definition.label;
    holder.zIndex = 0;
    this.layerManager.layers.vehicles.addChild(holder);
    const placeholder = new Graphics()
      .roundRect(-12, -4, 24, 8, 3)
      .fill({ color: 0x6b8995, alpha: 0.32 });
    holder.addChild(placeholder);

    void Promise.all([
      this.assets.load(definition.baseAssetId),
      this.assets.load(definition.mirroredAssetId)
    ]).then(([baseTexture, mirroredTexture]) => {
      if (
        !baseTexture
        || !mirroredTexture
        || !this.mounted
        || generation !== this.renderGeneration
        || holder.destroyed
      ) return;
      holder.removeChildren().forEach((child) => child.destroy());
      const sprite = new Sprite(baseTexture);
      sprite.anchor.set(0.5, 0.9);
      this.sizeSprite(sprite, definition.width);
      holder.addChild(sprite);
      this.noteLoaded(definition.baseAssetId);
      this.noteLoaded(definition.mirroredAssetId);
      const actor: AnimatedProductVehicle = {
        container: holder,
        sprite,
        baseTexture,
        mirroredTexture,
        path: projectedPath,
        segmentLengths,
        totalLength,
        progress: definition.phase,
        speed: definition.speed
      };
      this.positionVehicle(actor);
      this.movingVehicles.push(actor);
    });
  }

  private animateVehicles(deltaTime: number): void {
    if (!this.mounted || this.movingVehicles.length === 0) return;
    const elapsedSeconds = deltaTime / 60;
    for (const actor of this.movingVehicles) {
      if (actor.container.destroyed) continue;
      actor.progress = (actor.progress + actor.speed * elapsedSeconds) % 1;
      this.positionVehicle(actor);
    }
    this.layerManager.layers.vehicles.sortChildren();
  }

  private positionVehicle(actor: AnimatedProductVehicle): void {
    let remaining = actor.progress * actor.totalLength;
    for (let index = 0; index < actor.segmentLengths.length; index += 1) {
      const segmentLength = actor.segmentLengths[index]!;
      const from = actor.path[index]!;
      const to = actor.path[index + 1]!;
      if (remaining > segmentLength) {
        remaining -= segmentLength;
        continue;
      }
      const progress = segmentLength > 0 ? remaining / segmentLength : 0;
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;
      actor.container.position.set(x, y);
      actor.container.zIndex = Math.round(y * 1000 + 40);
      actor.sprite.texture = to.x >= from.x ? actor.baseTexture : actor.mirroredTexture;
      return;
    }
    const last = actor.path[actor.path.length - 1];
    if (last) actor.container.position.set(last.x, last.y);
  }

  private drawPlots(
    plots: readonly PlotSceneState[],
    placement: CitySceneState['placement'],
    generation: number
  ): void {
    if (!placement) return;
    for (const plot of plots) {
      if (plot.occupied || plot.locked) continue;
      const color = plot.available ? 0x5ce1a3 : plot.blocked ? 0xff667f : 0x4ad7ff;
      const overlay = new Graphics()
        .poly(this.diamondPoints(plot, 4.8 * plot.scale, 4.8 * plot.scale))
        .fill({ color, alpha: plot.available ? 0.16 : 0.07 })
        .stroke({ color, alpha: plot.available ? 0.8 : 0.35, width: 2 });
      overlay.zIndex = this.depth(plot, 500);
      overlay.eventMode = 'static';
      overlay.cursor = plot.available ? 'pointer' : 'not-allowed';
      overlay.on('pointertap', () => {
        if (
          generation !== this.renderGeneration
          || !plot.available
          || !this.input?.canActivateObject()
        ) return;
        this.actions.onPlotClick(plot.id);
      });
      this.layerManager.layers.overlays.addChild(overlay);
      const position = this.project(plot);
      this.drawLabel(
        plot.available ? plot.label : plot.blockedReason ?? plot.label,
        position.x,
        position.y + 24,
        color,
        this.depth(plot, 520)
      );
    }
  }

  private addAssetSprite(options: AssetSpriteOptions): Container {
    const position = this.project(options.point);
    const holder = new Container();
    holder.position.set(position.x, position.y);
    holder.zIndex = this.depth(options.point, options.zOffset ?? 0);
    options.layer.addChild(holder);

    const placeholder = new Graphics()
      .circle(0, 0, Math.max(4, options.width * 0.045))
      .fill({ color: options.placeholderColor ?? 0x4ad7ff, alpha: 0.16 });
    holder.addChild(placeholder);

    void this.assets.load(options.assetId).then((texture) => {
      if (!texture || !this.mounted || options.generation !== this.renderGeneration || holder.destroyed) return;
      holder.removeChildren().forEach((child) => child.destroy());
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, options.anchorY);
      this.sizeSprite(sprite, options.width);
      sprite.alpha = options.alpha ?? 1;
      sprite.tint = options.tint ?? 0xffffff;
      if (options.onActivate) {
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        sprite.on('pointertap', () => {
          if (options.generation !== this.renderGeneration || !this.input?.canActivateObject()) return;
          options.onActivate?.();
        });
      }
      holder.addChild(sprite);
      this.noteLoaded(options.assetId);
    });
    return holder;
  }

  private sizeSprite(sprite: Sprite, width: number): void {
    const textureWidth = Math.max(1, sprite.texture.width);
    const textureHeight = Math.max(1, sprite.texture.height);
    sprite.width = width;
    sprite.height = width * (textureHeight / textureWidth);
  }

  private noteLoaded(assetId: string): void {
    this.loadedAssetIds.add(assetId);
    this.updateLoadedAssetDataset();
  }

  private updateLoadedAssetDataset(): void {
    const ids = [...this.loadedAssetIds].sort();
    this.host.dataset.productAssetsLoaded = ids.join(',');
    this.host.dataset.productAssetCount = String(ids.length);
  }

  private drawLabel(textValue: string, x: number, y: number, color: number, zIndex: number): void {
    const text = new Text({
      text: textValue,
      style: {
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        fontWeight: '600',
        fill: 0xeefaff
      }
    });
    text.anchor.set(0.5, 0.5);
    const width = Math.max(62, text.width + 18);
    const panel = new Graphics()
      .roundRect(-width * 0.5, -11, width, 22, 7)
      .fill({ color: 0x06131b, alpha: 0.84 })
      .stroke({ color, alpha: 0.48, width: 1 });
    const holder = new Container();
    holder.position.set(x, y);
    holder.zIndex = zIndex;
    holder.addChild(panel, text);
    this.layerManager.layers.overlays.addChild(holder);
  }
}
