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
  if (facility.configId.includes('solar')) return 150 * facility.scale;
  if (facility.configId.includes('wind')) return 176 * facility.scale;
  if (facility.configId.includes('gas')) return 166 * facility.scale;
  if (facility.configId.includes('battery') || facility.configId.includes('storage')) {
    return 158 * facility.scale;
  }
  return 150 * facility.scale;
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
      backgroundColor: 0x07151b,
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
    canvas.setAttribute('aria-label', 'City-01 正式产品素材城市，可拖动、缩放和操作设施');
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

    this.drawGround(state);
    this.drawCommittedEnvironment(generation);
    this.drawRoadConnectors(state.roads);
    this.drawEnergyNetwork(state, generation);
    this.drawDistricts(state, generation);
    this.drawFacilities(state, generation);
    this.drawCrew(generation, state.presentationMode === 'grid');
    this.drawVehicles(generation);
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

  private diamondPoints(point: ScenePoint, radiusX: number, radiusZ: number): number[] {
    const points = [
      this.project({ ...point, x: point.x - radiusX }),
      this.project({ ...point, z: point.z - radiusZ }),
      this.project({ ...point, x: point.x + radiusX }),
      this.project({ ...point, z: point.z + radiusZ })
    ];
    return points.flatMap(({ x, y }) => [x, y]);
  }

  private drawGround(state: CitySceneState): void {
    const center = state.focus ?? state.city;
    const ground = new Graphics()
      .poly(this.diamondPoints(center, 112, 112))
      .fill({ color: 0x18372e, alpha: 1 })
      .stroke({ color: 0x83b8a0, alpha: 0.18, width: 2 });
    ground.zIndex = -1000000;
    this.layerManager.layers.terrain.addChild(ground);
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

  private drawRoadConnectors(roads: readonly RoadSceneState[]): void {
    for (const road of roads) {
      if (road.points.length < 2) continue;
      const projected = road.points.map((point) => this.project(point));
      const first = projected[0];
      if (!first) continue;
      const underlay = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) underlay.lineTo(point.x, point.y);
      underlay.stroke({
        color: 0x172226,
        alpha: 0.72,
        width: road.laneCount === 2 ? 11 : 7,
        cap: 'round',
        join: 'round'
      });
      underlay.zIndex = this.depth(road.points[0]!, -470);
      this.layerManager.layers.roads.addChild(underlay);

      const center = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) center.lineTo(point.x, point.y);
      center.stroke({
        color: road.powered ? 0xe5c96c : 0x7b878c,
        alpha: road.laneCount === 2 ? 0.3 : 0.18,
        width: 1,
        cap: 'round'
      });
      center.zIndex = this.depth(road.points[0]!, -469);
      this.layerManager.layers.roads.addChild(center);
    }
  }

  private drawDistricts(state: CitySceneState, generation: number): void {
    for (const district of state.districtPrefabs ?? []) {
      const width = district.width * 8.35 * district.scale;
      const position = this.project(district);
      const shadow = new Graphics()
        .ellipse(position.x, position.y + 3, width * 0.36, width * 0.13)
        .fill({ color: 0x000000, alpha: 0.24 });
      shadow.zIndex = this.depth(district, -65);
      this.layerManager.layers.buildingShadows.addChild(shadow);

      this.addAssetSprite({
        assetId: city01DistrictAssetIds[district.kind],
        point: { ...district, elevation: district.elevation + 0.36 },
        width,
        anchorY: 0.9115,
        generation,
        layer: this.layerManager.layers.buildings,
        alpha: district.status === 'offline' ? 0.72 : 1,
        tint: districtTint(district),
        placeholderColor: districtStatusColor(district)
      });

      if (state.presentationMode === 'grid' || district.status !== 'normal') {
        this.drawDistrictLabel(district);
      }
    }
  }

  private drawDistrictLabel(district: DistrictPrefabSceneState): void {
    const position = this.project({ ...district, elevation: 2.1 });
    const color = districtStatusColor(district);
    const value = district.status === 'normal'
      ? district.label
      : `${district.label} · ${Math.round(district.powerRatio * 100)}%`;
    this.drawLabel(value, position.x, position.y - 42, color, this.depth(district, 270));
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
      const position = this.project(facility);
      const shadow = new Graphics()
        .ellipse(position.x, position.y + 3, width * 0.28, width * 0.1)
        .fill({ color: 0x000000, alpha: 0.26 });
      shadow.zIndex = this.depth(facility, -30);
      this.layerManager.layers.buildingShadows.addChild(shadow);

      this.addAssetSprite({
        assetId,
        point: facility,
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

  private drawEnergyNetwork(state: CitySceneState, generation: number): void {
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
        alpha: state.presentationMode === 'grid' ? 0.18 : 0.07,
        width: 6 + clamp(edge.loadRatio, 0, 1.4) * 2,
        cap: 'round',
        join: 'round'
      });
      glow.zIndex = this.depth(edge.points[0]!, -80);
      this.layerManager.layers.effects.addChild(glow);

      const line = new Graphics().moveTo(first.x, first.y);
      for (const point of projected.slice(1)) line.lineTo(point.x, point.y);
      line.stroke({
        color,
        alpha: edge.status === 'offline' ? 0.62 : 0.86,
        width: 1.5 + clamp(edge.loadRatio, 0, 1.4) * 1.4,
        cap: 'round',
        join: 'round'
      });
      line.zIndex = this.depth(edge.points[0]!, -79);
      this.layerManager.layers.effects.addChild(line);

      if (state.presentationMode === 'grid') {
        const middle = projected[Math.floor(projected.length / 2)];
        if (middle) {
          this.drawLabel(
            `${Math.round(edge.loadRatio * 100)}%`,
            middle.x,
            middle.y - 12,
            color,
            this.depth(edge.points[0]!, 310)
          );
        }
      }
    }

    for (const node of state.networkNodes ?? []) {
      if (node.kind !== 'substation' && node.kind !== 'distribution') continue;
      const assetId = node.kind === 'substation'
        ? 'facility_main_substation_base'
        : 'facility_distribution_node_base';
      this.addAssetSprite({
        assetId,
        point: { ...node, elevation: node.elevation + 0.45 },
        width: node.kind === 'substation' ? 164 : 104,
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

  private drawNetworkNodeLabel(node: EnergyNetworkNodeSceneState): void {
    const position = this.project({ ...node, elevation: 1.6 });
    const color = networkNodeColor(node);
    this.drawLabel(
      `${node.label} · ${Math.round(node.loadRatio * 100)}%`,
      position.x,
      position.y + 28,
      color,
      this.depth(node, 330)
    );
  }

  private drawCrew(generation: number, diagnostics: boolean): void {
    for (const marker of city01CrewMarkers) {
      this.addAssetSprite({
        assetId: marker.iconAssetId,
        point: marker.point,
        width: diagnostics ? 46 : 38,
        anchorY: 1,
        generation,
        layer: this.layerManager.layers.overlays,
        alpha: diagnostics ? 1 : 0.88,
        zOffset: 420,
        placeholderColor: 0x5ce1a3
      });
      if (diagnostics) {
        const position = this.project(marker.point);
        this.drawLabel(marker.label, position.x, position.y + 12, 0x5ce1a3, this.depth(marker.point, 440));
      }
    }
  }

  private drawVehicles(generation: number): void {
    for (const definition of city01VehicleDefinitions) {
      this.addVehicle(definition, generation);
    }
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
      .roundRect(-18, -6, 36, 12, 4)
      .fill({ color: 0x6b8995, alpha: 0.46 });
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
      .ellipse(0, 0, options.width * 0.28, Math.max(8, options.width * 0.09))
      .fill({ color: options.placeholderColor ?? 0x4ad7ff, alpha: 0.14 });
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
    const width = Math.max(60, text.width + 18);
    const panel = new Graphics()
      .roundRect(-width * 0.5, -11, width, 22, 7)
      .fill({ color: 0x06131b, alpha: 0.8 })
      .stroke({ color, alpha: 0.42, width: 1 });
    const holder = new Container();
    holder.position.set(x, y);
    holder.zIndex = zIndex;
    holder.addChild(panel, text);
    this.layerManager.layers.overlays.addChild(holder);
  }
}
