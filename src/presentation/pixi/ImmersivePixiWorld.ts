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
  AmbientBlockSceneState,
  CitySceneState,
  DistrictPrefabSceneState,
  EnergyNetworkEdgeSceneState,
  EnergyNetworkNodeSceneState,
  EnvironmentPrefabSceneState,
  FacilitySceneState,
  PlotSceneState,
  RoadSceneState,
  ScenePoint
} from '../CitySceneMapper';
import {
  selectVisibleNetworkEdges,
  shouldRenderDistrictLabel,
  shouldRenderNetworkEdge,
  shouldRenderNetworkNodeAsset,
  shouldRenderNetworkNodeDiagnostics
} from '../CommercialPresentationPolicy';
import { planCommercialFacilities } from '../CommercialLandmarkPlanner';
import {
  planCommercialCityLife,
  type CityFabricPatch,
  type CommercialCityLifePlan
} from '../CommercialCityLifePlanner';
import { FacilityVisualRegistry } from '../visuals/FacilityVisualRegistry';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { PixiAssetLoader } from './PixiAssetLoader';
import { WorldCamera } from './WorldCamera';
import { WorldInputController } from './WorldInputController';
import { WorldLayerManager } from './WorldLayerManager';
import { ImmersiveRoadGrid } from './generation/ImmersiveRoadGrid';
import { RoadAutoTiler, RoadDirection } from './generation/RoadAutoTiler';

const SCENE_UNITS_PER_GRID = 10;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;
const ELEVATION_HEIGHT = 11.5;
const ROAD_STEP = 10;
const WORLD_RADIUS = 360;

interface DistrictSlot {
  x: number;
  z: number;
  scale: number;
}

interface AnimatedVehicle {
  display: Container;
  path: readonly { x: number; y: number }[];
  segmentLengths: readonly number[];
  totalLength: number;
  progress: number;
  speed: number;
}

interface AnimatedRecoveryPulse {
  display: Container;
  phase: number;
  intensity: number;
}

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

const districtBuildingAssets: Record<DistrictPrefabSceneState['kind'], readonly string[]> = {
  residential: ['res_tower_a', 'res_tower_b', 'res_slab_a', 'res_slab_b', 'res_townhouse'],
  commercial: ['com_mall', 'com_office', 'com_landmark', 'com_strip'],
  industrial: ['ind_factory', 'ind_warehouse', 'ind_tankfarm', 'ind_heavy'],
  public: ['civic_hospital', 'civic_school', 'civic_cityhall', 'civic_transit'],
  old_town: ['res_oldblock', 'res_townhouse', 'res_slab_b', 'res_oldblock']
};

const districtSlots: Record<DistrictPrefabSceneState['kind'], readonly DistrictSlot[]> = {
  residential: [
    { x: -0.3, z: -0.2, scale: 0.88 },
    { x: 0, z: -0.3, scale: 1.04 },
    { x: 0.3, z: -0.16, scale: 0.9 },
    { x: -0.28, z: 0.22, scale: 0.76 },
    { x: 0.05, z: 0.12, scale: 0.94 },
    { x: 0.32, z: 0.25, scale: 0.78 },
    { x: -0.02, z: 0.36, scale: 0.7 }
  ],
  commercial: [
    { x: -0.28, z: -0.2, scale: 0.88 },
    { x: 0.02, z: -0.28, scale: 1.1 },
    { x: 0.31, z: -0.12, scale: 0.88 },
    { x: -0.24, z: 0.25, scale: 0.78 },
    { x: 0.08, z: 0.16, scale: 0.98 },
    { x: 0.34, z: 0.28, scale: 0.72 }
  ],
  industrial: [
    { x: -0.28, z: -0.24, scale: 0.94 },
    { x: 0.04, z: -0.25, scale: 1.02 },
    { x: 0.32, z: -0.1, scale: 0.84 },
    { x: -0.18, z: 0.24, scale: 0.88 },
    { x: 0.23, z: 0.26, scale: 0.8 }
  ],
  public: [
    { x: -0.22, z: -0.18, scale: 1.04 },
    { x: 0.24, z: -0.13, scale: 0.9 },
    { x: -0.2, z: 0.25, scale: 0.82 },
    { x: 0.25, z: 0.24, scale: 0.84 }
  ],
  old_town: [
    { x: -0.3, z: -0.24, scale: 0.78 },
    { x: -0.02, z: -0.3, scale: 0.84 },
    { x: 0.29, z: -0.14, scale: 0.74 },
    { x: -0.28, z: 0.22, scale: 0.72 },
    { x: 0.02, z: 0.17, scale: 0.8 },
    { x: 0.3, z: 0.28, scale: 0.7 }
  ]
};

const districtLabelOffsets: Record<DistrictPrefabSceneState['kind'], { x: number; y: number }> = {
  residential: { x: -62, y: -58 },
  commercial: { x: -72, y: 46 },
  industrial: { x: 74, y: -46 },
  public: { x: -70, y: 42 },
  old_town: { x: 74, y: 36 }
};

const terrainByBlockKind: Record<AmbientBlockSceneState['kind'], string> = {
  residential: 'world_terrain_residential_lot',
  industrial: 'world_terrain_industrial_lot',
  utility: 'world_terrain_civic_lot',
  park: 'world_terrain_park_lot'
};

const districtGroundColor: Record<DistrictPrefabSceneState['kind'], number> = {
  residential: 0x25463f,
  commercial: 0x263d4f,
  industrial: 0x3c3a34,
  public: 0x2b4a48,
  old_town: 0x342e31
};

const commercialDistrictRenderScale: Record<DistrictPrefabSceneState['kind'], number> = {
  residential: 10.2,
  commercial: 10.8,
  industrial: 10.6,
  public: 10.4,
  old_town: 10.8
};

const commercialFabricColor: Record<CityFabricPatch['tone'], number> = {
  core: 0x1a3432,
  waterfront: 0x19383a,
  service: 0x283735,
  greenway: 0x23483a
};

const commercialFacilityWidth = (facility: FacilitySceneState): number => {
  const base = facility.configId.includes('solar')
    ? 128
    : facility.configId.includes('wind')
      ? 184
      : facility.configId.includes('gas')
        ? 172
        : facility.configId.includes('battery')
          ? 158
          : 174;
  return base * facility.scale;
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
  return 0x6f858d;
};

const networkNodeColor = (node: EnergyNetworkNodeSceneState): number => {
  if (node.status === 'active') return 0x55ddff;
  if (node.status === 'warning') return 0xffc45f;
  if (node.status === 'offline') return 0xff667f;
  return 0x71858d;
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
  private animationTime = 0;
  private readonly movingVehicles: AnimatedVehicle[] = [];
  private readonly recoveryPulses: AnimatedRecoveryPulse[] = [];

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
    const focus = this.project(this.state.focus ?? this.state.city);
    const authored = this.state.sceneMode === 'authored';
    const startZoom = clamp(
      this.state.camera.startZoom * (authored ? 1 : 1.16),
      this.state.camera.minZoom,
      this.state.camera.maxZoom
    );
    this.camera.configure({
      ...this.state.camera,
      startZoom,
      startOffsetY: this.state.camera.startOffsetY + (authored ? 0 : 30)
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
    this.app.ticker.add((ticker) => this.animateCommercialLife(ticker.deltaTime));

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
    this.recoveryPulses.length = 0;
    this.layerManager.clear();
    const accent = toColor(state.accent);
    const authored = state.sceneMode === 'authored' && Boolean(state.districtPrefabs?.length);
    const showDiagnostics = state.presentationMode === 'grid';
    const commercialLife = authored && state.levelId === 'city-01'
      ? planCommercialCityLife(state)
      : undefined;
    this.host.dataset.presentationMode = showDiagnostics ? 'grid' : 'city';

    this.drawTerrain(state, accent);
    if (authored) {
      if (commercialLife) this.drawCommercialCityFabric(commercialLife);
      this.drawEnvironment(state.environment ?? []);
      this.drawAuthoredRoads(state.roads);
      if (commercialLife) this.drawCommercialStreetLife(commercialLife);
      this.drawEnergyNetwork(state, generation, showDiagnostics);
      this.drawDistrictPrefabs(state, generation, showDiagnostics);
      if (commercialLife && !showDiagnostics) this.drawDistrictRecovery(commercialLife);
    } else {
      const roads = ImmersiveRoadGrid.fromRoads(state.roads, ROAD_STEP);
      this.drawDistrictGround(state, accent);
      this.drawRoadTiles(roads, generation);
      this.drawFacilityAccessRoads(state, roads);
      this.drawAmbientBlocks(state, roads, generation);
    }
    this.drawFacilities(state, generation);
    if (!authored) this.drawEnergyLinks(state, accent);
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

  private traceSmoothPath(graphics: Graphics, points: readonly ScenePoint[]): void {
    if (points.length < 2) return;
    const projected = points.map((point) => this.project(point));
    const first = projected[0];
    const last = projected[projected.length - 1];
    if (!first || !last) return;
    graphics.moveTo(first.x, first.y);
    if (projected.length === 2) {
      graphics.lineTo(last.x, last.y);
      return;
    }
    for (let index = 1; index < projected.length - 1; index += 1) {
      const current = projected[index];
      const next = projected[index + 1];
      if (!current || !next) continue;
      graphics.quadraticCurveTo(
        current.x,
        current.y,
        (current.x + next.x) * 0.5,
        (current.y + next.y) * 0.5
      );
    }
    graphics.lineTo(last.x, last.y);
  }

  private roundedDiamond(point: ScenePoint, radiusX: number, radiusZ: number): Graphics {
    const corners = [
      this.project({ ...point, x: point.x - radiusX }),
      this.project({ ...point, z: point.z - radiusZ }),
      this.project({ ...point, x: point.x + radiusX }),
      this.project({ ...point, z: point.z + radiusZ })
    ];
    const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
      x: (a.x + b.x) * 0.5,
      y: (a.y + b.y) * 0.5
    });
    const start = mid(corners[3]!, corners[0]!);
    const graphics = new Graphics().moveTo(start.x, start.y);
    for (let index = 0; index < corners.length; index += 1) {
      const corner = corners[index]!;
      const next = corners[(index + 1) % corners.length]!;
      const end = mid(corner, next);
      graphics.quadraticCurveTo(corner.x, corner.y, end.x, end.y);
    }
    return graphics;
  }

  private drawTerrain(state: CitySceneState, accent: number): void {
    const center = state.focus ?? state.city;
    const baseColor = state.theme === 'industrial'
      ? 0x182229
      : state.theme === 'green'
        ? 0x112921
        : state.sceneMode === 'authored'
          ? 0x10251f
          : 0x10252b;
    const radius = state.sceneMode === 'authored' ? 150 : WORLD_RADIUS;
    const ground = this.roundedDiamond(center, radius, radius)
      .fill({ color: baseColor, alpha: 1 });
    ground.zIndex = -1000000;
    this.layerManager.layers.terrain.addChild(ground);

    if (state.sceneMode === 'authored' && !state.placement) return;
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
    grid.stroke({ color: accent, alpha: state.placement ? 0.065 : 0.025, width: 1 });
    grid.zIndex = -999999;
    this.layerManager.layers.terrain.addChild(grid);
  }

  private drawCommercialCityFabric(plan: CommercialCityLifePlan): void {
    for (const patch of plan.fabric) {
      const points = patch.points
        .map((candidate) => this.project(candidate))
        .flatMap(({ x, y }) => [x, y]);
      const shape = new Graphics()
        .poly(points)
        .fill({
          color: commercialFabricColor[patch.tone],
          alpha: patch.tone === 'greenway' ? 0.62 : 0.92
        })
        .stroke({
          color: patch.tone === 'waterfront' ? 0x4f8d91 : 0x68817b,
          alpha: patch.tone === 'greenway' ? 0.08 : 0.12,
          width: patch.tone === 'core' ? 2 : 1
        });
      shape.zIndex = -650 + plan.fabric.indexOf(patch);
      this.layerManager.layers.terrain.addChild(shape);
    }
  }

  private drawCommercialStreetLife(plan: CommercialCityLifePlan): void {
    for (const light of plan.streetLights) {
      const position = this.project(light.point);
      const container = new Container();
      container.position.set(position.x, position.y);
      container.zIndex = this.depth(light.point, 5);
      const post = new Graphics()
        .rect(-1, -10, 2, 12)
        .fill({ color: 0x6f858a, alpha: 0.82 })
        .rect(-3.2, 1, 6.4, 1.6)
        .fill({ color: 0x1a2529, alpha: 0.82 });
      const bulbColor = light.lit ? 0xffd878 : 0x65757a;
      const bulb = new Graphics()
        .circle(0, -11, 2.6)
        .fill({ color: bulbColor, alpha: light.lit ? 0.98 : 0.72 });
      if (light.lit) {
        bulb.circle(0, -11, 7).fill({ color: 0xffd878, alpha: 0.08 });
      }
      container.addChild(post, bulb);
      this.layerManager.layers.groundDecorations.addChild(container);
    }

    const vehicleColors = {
      commuter: 0x5db6d2,
      service: 0xf0c75d,
      freight: 0xc57a4d
    } as const;
    for (const vehicle of plan.vehicles) {
      const projectedPath = vehicle.path.map((candidate) => this.project(candidate));
      if (projectedPath.length < 2) continue;
      const segmentLengths = projectedPath.slice(0, -1).map((from, index) => {
        const to = projectedPath[index + 1]!;
        return Math.hypot(to.x - from.x, to.y - from.y);
      });
      const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
      if (totalLength <= 0) continue;

      const display = new Container();
      const body = new Graphics()
        .roundRect(-5.5, -2.8, 11, 5.6, 1.8)
        .fill({ color: vehicleColors[vehicle.tone], alpha: 0.96 })
        .roundRect(-2.8, -2.2, 5.6, 2.1, 1)
        .fill({ color: 0x16313a, alpha: 0.9 })
        .circle(-3.6, 2.7, 1.15)
        .fill({ color: 0x101619, alpha: 1 })
        .circle(3.6, 2.7, 1.15)
        .fill({ color: 0x101619, alpha: 1 });
      if (vehicle.headlights) {
        body.circle(5.2, -1.35, 1).fill({ color: 0xffe6a8, alpha: 0.95 });
        body.circle(5.2, 1.35, 1).fill({ color: 0xffe6a8, alpha: 0.95 });
      }
      display.addChild(body);
      display.zIndex = this.depth(vehicle.path[0]!, 12);
      this.layerManager.layers.groundDecorations.addChild(display);
      const actor: AnimatedVehicle = {
        display,
        path: projectedPath,
        segmentLengths,
        totalLength,
        progress: vehicle.phase,
        speed: vehicle.speed
      };
      this.positionVehicle(actor);
      this.movingVehicles.push(actor);
    }
  }

  private drawDistrictRecovery(plan: CommercialCityLifePlan): void {
    for (const cue of plan.recovery) {
      const position = this.project(cue.point);
      const color = cue.status === 'warning'
        ? 0xffd45f
        : cue.status === 'blackout'
          ? 0xff9b54
          : 0xff667f;
      const container = new Container();
      container.position.set(position.x, position.y + 6);
      container.zIndex = this.depth(cue.point, 48);
      const pulse = new Graphics()
        .ellipse(0, 0, cue.width * 3.7, cue.depth * 1.75)
        .stroke({ color, alpha: 0.8, width: 2 });
      container.addChild(pulse);
      container.alpha = 0.08;
      this.layerManager.layers.effects.addChild(container);
      this.recoveryPulses.push({
        display: container,
        phase: cue.phase,
        intensity: cue.intensity
      });
    }
  }

  private animateCommercialLife(deltaTime: number): void {
    if (!this.mounted) return;
    const elapsedSeconds = deltaTime / 60;
    this.animationTime += elapsedSeconds;
    for (const actor of this.movingVehicles) {
      if (actor.display.destroyed) continue;
      actor.progress = (actor.progress + actor.speed * elapsedSeconds) % 1;
      this.positionVehicle(actor);
    }
    for (const pulse of this.recoveryPulses) {
      if (pulse.display.destroyed) continue;
      const wave = (Math.sin((this.animationTime * 0.72 + pulse.phase) * Math.PI * 2) + 1) * 0.5;
      pulse.display.alpha = 0.045 + wave * 0.16 * pulse.intensity;
      pulse.display.scale.set(0.985 + wave * 0.035);
    }
  }

  private positionVehicle(actor: AnimatedVehicle): void {
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
      actor.display.position.set(
        from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress
      );
      actor.display.rotation = Math.atan2(to.y - from.y, to.x - from.x);
      return;
    }
    const last = actor.path[actor.path.length - 1];
    if (last) actor.display.position.set(last.x, last.y);
  }

  private drawEnvironment(environment: readonly EnvironmentPrefabSceneState[]): void {
    for (const item of environment) {
      if (item.kind === 'water' || item.kind === 'coast' || item.kind === 'park') {
        const color = item.kind === 'water'
          ? 0x071d29
          : item.kind === 'coast'
            ? 0x1e3433
            : 0x28543e;
        const alpha = item.kind === 'water' ? 0.97 : item.kind === 'coast' ? 0.72 : 0.76;
        const shape = this.roundedDiamond(item, item.width * 0.5, item.depth * 0.5)
          .fill({ color, alpha });
        if (item.kind === 'water') {
          shape.stroke({ color: 0x4c9cb2, alpha: 0.18, width: 2 });
        }
        shape.zIndex = this.depth(item, -400);
        this.layerManager.layers.terrain.addChild(shape);
        if (item.kind === 'park') this.drawEnvironmentTrees(item, 9);
        continue;
      }
      if (item.kind === 'forest') {
        this.drawEnvironmentTrees(item, Math.round(10 + item.density * 18));
        continue;
      }
      this.drawRidge(item);
    }
  }

  private drawEnvironmentTrees(item: EnvironmentPrefabSceneState, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const point: ScenePoint = {
        x: item.x + (seededUnit(item.variant, index * 3 + 1) - 0.5) * item.width,
        z: item.z + (seededUnit(item.variant, index * 3 + 2) - 0.5) * item.depth,
        elevation: 0.05
      };
      const position = this.project(point);
      const size = 4.5 + seededUnit(item.variant, index * 3 + 3) * 5;
      const tree = new Graphics()
        .rect(position.x - 1.2, position.y - 1, 2.4, 7)
        .fill({ color: 0x3f3126, alpha: 0.86 })
        .circle(position.x, position.y - 5, size)
        .fill({ color: item.kind === 'park' ? 0x4d956a : 0x274f3b, alpha: 0.94 })
        .circle(position.x - size * 0.25, position.y - 7, size * 0.64)
        .fill({ color: item.kind === 'park' ? 0x5aa478 : 0x315e47, alpha: 0.72 });
      tree.zIndex = this.depth(point, 1);
      this.layerManager.layers.groundDecorations.addChild(tree);
    }
  }

  private drawRidge(item: EnvironmentPrefabSceneState): void {
    const colors = [0x142724, 0x1b332e, 0x24443a];
    for (let layer = 0; layer < 3; layer += 1) {
      const point: ScenePoint = {
        x: item.x,
        z: item.z + layer * 2.2,
        elevation: 0.18 + layer * 0.12
      };
      const ridge = this.roundedDiamond(
        point,
        item.width * (0.48 - layer * 0.035),
        item.depth * (0.58 - layer * 0.06)
      )
        .fill({ color: colors[layer] ?? colors[0]!, alpha: 0.72 - layer * 0.08 })
        .stroke({ color: 0x52736c, alpha: 0.08, width: 1 });
      ridge.zIndex = this.depth(item, -80 + layer);
      this.layerManager.layers.terrain.addChild(ridge);
    }
  }

  private drawDistrictGround(state: CitySceneState, accent: number): void {
    for (const district of state.districts) {
      const lowPower = district.powerRatio < 0.85;
      const color = lowPower ? 0x6f2635 : accent;
      const shape = this.roundedDiamond(district, district.radiusX, district.radiusZ)
        .fill({ color, alpha: lowPower ? 0.055 : 0.018 });
      shape.zIndex = this.depth(district, -50);
      this.layerManager.layers.terrain.addChild(shape);
    }
  }

  private drawAuthoredRoads(roads: readonly RoadSceneState[]): void {
    for (const road of roads) {
      if (road.points.length < 2) continue;
      const outer = new Graphics();
      this.traceSmoothPath(outer, road.points);
      outer.stroke({
        color: 0x071015,
        alpha: 0.64,
        width: road.laneCount === 2 ? 20 : 13,
        cap: 'round',
        join: 'round'
      });
      outer.zIndex = this.depth(road.points[0]!, -18);
      this.layerManager.layers.roads.addChild(outer);

      const surface = new Graphics();
      this.traceSmoothPath(surface, road.points);
      surface.stroke({
        color: road.powered ? 0x293a3f : 0x20282c,
        alpha: 0.96,
        width: road.laneCount === 2 ? 14 : 8,
        cap: 'round',
        join: 'round'
      });
      surface.zIndex = this.depth(road.points[0]!, -17);
      this.layerManager.layers.roads.addChild(surface);

      const center = new Graphics();
      this.traceSmoothPath(center, road.points);
      center.stroke({
        color: road.laneCount === 2 ? 0xe8c967 : 0x789097,
        alpha: road.laneCount === 2 ? 0.34 : 0.18,
        width: road.laneCount === 2 ? 1.4 : 0.8,
        cap: 'round'
      });
      center.zIndex = this.depth(road.points[0]!, -16);
      this.layerManager.layers.roads.addChild(center);
    }
  }

  private drawEnergyNetwork(
    state: CitySceneState,
    generation: number,
    showDiagnostics: boolean
  ): void {
    for (const edge of selectVisibleNetworkEdges(state.networkEdges ?? [], showDiagnostics)) {
      if (edge.points.length < 2 || !shouldRenderNetworkEdge(edge, showDiagnostics)) continue;
      const color = networkEdgeColor(edge);
      const glow = new Graphics();
      this.traceSmoothPath(glow, edge.points);
      glow.stroke({
        color,
        alpha: edge.status === 'planned' ? 0.06 : 0.12,
        width: 7 + clamp(edge.loadRatio, 0, 1.4) * 2,
        cap: 'round',
        join: 'round'
      });
      glow.zIndex = this.depth(edge.points[0]!, -4);
      this.layerManager.layers.groundDecorations.addChild(glow);

      const beam = new Graphics();
      this.traceSmoothPath(beam, edge.points);
      beam.stroke({
        color,
        alpha: edge.status === 'planned' ? 0.24 : edge.status === 'offline' ? 0.62 : 0.72,
        width: 1.6 + clamp(edge.loadRatio, 0, 1.4) * 1.5,
        cap: 'round',
        join: 'round'
      });
      beam.zIndex = this.depth(edge.points[0]!, -3);
      this.layerManager.layers.groundDecorations.addChild(beam);
    }

    for (const node of state.networkNodes ?? []) {
      this.drawNetworkNode(node, generation, showDiagnostics, state.levelId === 'city-01');
    }
  }

  private drawNetworkNode(
    node: EnergyNetworkNodeSceneState,
    generation: number,
    showDiagnostics: boolean,
    commercial: boolean
  ): void {
    if (node.kind === 'district') return;
    const color = networkNodeColor(node);
    if (shouldRenderNetworkNodeAsset(node, showDiagnostics) && (node.kind === 'substation' || node.kind === 'distribution')) {
      const assetPrefix = node.kind === 'substation' ? 'substation' : 'grid_node';
      const stateSuffix = node.status === 'offline'
        ? 'offline'
        : node.status === 'warning'
          ? 'overload'
          : 'active';
      const bodyAssetId = commercial && node.kind === 'substation'
        ? `commercial_facility_substation_${node.status === 'offline' ? 'offline' : 'active'}`
        : `world_facility_${assetPrefix}_${stateSuffix}`;
      this.addAssetObject({
        assetId: bodyAssetId,
        point: { ...node, elevation: node.elevation + 0.65 },
        width: commercial && node.kind === 'substation' ? 154 : node.kind === 'substation' ? 142 : 92,
        anchorY: 0.82,
        generation,
        layer: this.layerManager.layers.buildings,
        placeholderColor: color,
        alpha: node.status === 'offline' ? 0.72 : 0.96
      });
    }

    if (!shouldRenderNetworkNodeDiagnostics(node, showDiagnostics)) return;

    const position = this.project({ ...node, elevation: 0.35 });
    const marker = new Graphics()
      .circle(position.x, position.y, node.kind === 'substation' ? 12 : 8)
      .fill({ color: 0x061722, alpha: 0.78 })
      .stroke({ color, alpha: node.status === 'planned' ? 0.45 : 0.9, width: 2 });
    if (node.status !== 'planned') {
      marker.circle(position.x, position.y, 3.2).fill({ color, alpha: 1 });
    }
    marker.zIndex = this.depth(node, 18);
    this.layerManager.layers.effects.addChild(marker);

    if (node.kind !== 'substation' && node.kind !== 'distribution' && node.status !== 'planned') return;
    const text = new Text({
      text: node.status === 'planned' ? `${node.label} · 待建设` : node.label,
      style: {
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 10,
        fontWeight: '600',
        fill: node.status === 'planned' ? 0xaab8bd : 0xdff8ff
      }
    });
    text.anchor.set(0.5, 0.5);
    const panelWidth = Math.max(68, text.width + 18);
    const panel = new Graphics()
      .roundRect(-panelWidth * 0.5, -11, panelWidth, 22, 7)
      .fill({ color: 0x06131b, alpha: 0.78 })
      .stroke({ color, alpha: 0.3, width: 1 });
    const label = new Container();
    label.position.set(position.x, position.y + 24);
    label.zIndex = this.depth(node, 220);
    label.addChild(panel, text);
    this.layerManager.layers.overlays.addChild(label);
  }

  private drawDistrictPrefabs(
    state: CitySceneState,
    generation: number,
    showDiagnostics: boolean
  ): void {
    for (const district of state.districtPrefabs ?? []) {
      const statusColor = districtStatusColor(district);
      if (district.prefabAssetId) {
        const suffix = district.status === 'blackout' || district.status === 'offline' ? 'blackout' : 'night';
        const width = district.width * commercialDistrictRenderScale[district.kind] * district.scale;
        this.addAssetObject({
          assetId: 'commercial_district_shadow',
          point: { ...district, elevation: Math.max(-0.08, district.elevation - 0.28) },
          width,
          anchorY: 0.86,
          generation,
          layer: this.layerManager.layers.buildingShadows,
          alpha: 0.68,
          placeholderColor: 0x000000
        });
        this.addAssetObject({
          assetId: `${district.prefabAssetId}_${suffix}`,
          point: { ...district, elevation: district.elevation + 0.42 },
          width,
          anchorY: 0.86,
          generation,
          layer: this.layerManager.layers.buildings,
          alpha: district.status === 'offline' ? 0.8 : 1,
          placeholderColor: statusColor
        });
        if (shouldRenderDistrictLabel(district, showDiagnostics)) this.drawDistrictLabel(district);
        continue;
      }
      const ground = this.roundedDiamond(district, district.width * 0.5, district.depth * 0.5)
        .fill({
          color: districtGroundColor[district.kind],
          alpha: district.status === 'offline' ? 0.54 : 0.86
        })
        .stroke({ color: statusColor, alpha: district.status === 'normal' ? 0.12 : 0.46, width: 1.5 });
      ground.zIndex = this.depth(district, -80);
      this.layerManager.layers.terrain.addChild(ground);

      const internalRoad = new Graphics();
      this.traceSmoothPath(internalRoad, [
        { x: district.x - district.width * 0.35, z: district.z + district.depth * 0.1, elevation: -0.05 },
        { x: district.x, z: district.z, elevation: -0.05 },
        { x: district.x + district.width * 0.35, z: district.z - district.depth * 0.08, elevation: -0.05 }
      ]);
      internalRoad.stroke({ color: 0x25363b, alpha: 0.72, width: 5, cap: 'round' });
      internalRoad.zIndex = this.depth(district, -60);
      this.layerManager.layers.roads.addChild(internalRoad);

      const suffix = district.status === 'blackout' || district.status === 'offline'
        ? 'blackout'
        : state.hour < 6 || state.hour >= 18
          ? 'night'
          : 'day';
      const pool = districtBuildingAssets[district.kind];
      const slots = districtSlots[district.kind];
      const count = Math.min(district.buildingCount, slots.length);

      for (let index = 0; index < count; index += 1) {
        const slot = slots[index];
        const selected = pool[(index + district.variant) % pool.length];
        if (!slot || !selected) continue;
        const point: ScenePoint = {
          x: district.x + slot.x * district.width,
          z: district.z + slot.z * district.depth,
          elevation: 0.35 + (slot.z + 0.5) * 0.16
        };
        const sizeBias = district.kind === 'commercial'
          ? 14
          : district.kind === 'industrial'
            ? 5
            : district.kind === 'public'
              ? 9
              : 0;
        const width = (86 + sizeBias) * slot.scale * district.scale;
        this.addAssetObject({
          assetId: `world_building_${selected}_shadow`,
          point: { ...point, elevation: Math.max(-0.05, point.elevation - 0.42) },
          width,
          anchorY: 0.82,
          generation,
          layer: this.layerManager.layers.buildingShadows,
          alpha: 0.48,
          placeholderColor: 0x000000
        });
        this.addAssetObject({
          assetId: `world_building_${selected}_${suffix}`,
          point,
          width,
          anchorY: 0.82,
          generation,
          layer: this.layerManager.layers.buildings,
          alpha: district.status === 'offline' ? 0.66 : 0.96,
          placeholderColor: statusColor
        });
      }
      this.drawDistrictDecorations(district);
      if (shouldRenderDistrictLabel(district, showDiagnostics)) this.drawDistrictLabel(district);
    }
  }

  private drawDistrictLabel(district: DistrictPrefabSceneState): void {
    const center = this.project({ ...district, elevation: 2.2 });
    const offset = districtLabelOffsets[district.kind];
    const statusColor = districtStatusColor(district);
    const statusText = district.status === 'normal'
      ? district.label
      : district.status === 'offline'
        ? `${district.label} · 停电`
        : `${district.label} · ${Math.round(district.powerRatio * 100)}%`;
    const label = new Text({
      text: statusText,
      style: {
        fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: 11,
        fontWeight: '600',
        fill: 0xeefaff
      }
    });
    label.anchor.set(0.5, 0.5);
    const width = Math.max(78, label.width + 26);
    const panel = new Graphics()
      .roundRect(-width * 0.5, -12, width, 24, 7)
      .fill({ color: 0x061722, alpha: 0.82 })
      .stroke({ color: statusColor, alpha: district.status === 'normal' ? 0.32 : 0.7, width: 1 });
    const dot = new Graphics()
      .circle(-width * 0.5 + 10, 0, 3)
      .fill({ color: statusColor, alpha: 1 });
    const labelX = center.x + offset.x;
    const labelY = center.y + offset.y;
    const leader = new Graphics()
      .moveTo(center.x, center.y)
      .lineTo(labelX - Math.sign(offset.x || 1) * width * 0.35, labelY)
      .stroke({ color: statusColor, alpha: 0.28, width: 1 });
    leader.zIndex = this.depth(district, 230);
    this.layerManager.layers.overlays.addChild(leader);

    const container = new Container();
    container.position.set(labelX, labelY);
    container.zIndex = this.depth(district, 250);
    container.addChild(panel, dot, label);
    this.layerManager.layers.overlays.addChild(container);
  }

  private drawDistrictDecorations(district: DistrictPrefabSceneState): void {
    const treeCount = district.kind === 'industrial' ? 2 : district.kind === 'commercial' ? 3 : 5;
    for (let index = 0; index < treeCount; index += 1) {
      const edge = index % 2 === 0 ? -1 : 1;
      const point: ScenePoint = {
        x: district.x + edge * district.width * (0.37 + seededUnit(district.variant, index + 71) * 0.04),
        z: district.z + (seededUnit(district.variant, index + 83) - 0.5) * district.depth * 0.68,
        elevation: 0.08
      };
      const position = this.project(point);
      const tree = new Graphics()
        .rect(position.x - 1, position.y, 2, 8)
        .fill({ color: 0x4d3828, alpha: 0.82 })
        .circle(position.x, position.y - 4, 5.5)
        .fill({ color: district.kind === 'old_town' ? 0x375f49 : 0x4b8d65, alpha: 0.9 });
      tree.zIndex = this.depth(point, 3);
      this.layerManager.layers.groundDecorations.addChild(tree);
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
        width: 124,
        generation,
        alpha: cell.powered ? 0.88 : 0.62,
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
    const authored = state.sceneMode === 'authored';
    const facilities = authored && state.levelId === 'city-01'
      ? planCommercialFacilities(state.facilities)
      : state.facilities;
    for (const facility of facilities) {
      this.addFacilityLot(facility, generation);
      const visual = FacilityVisualRegistry.resolve({
        configId: facility.configId,
        category: facility.category,
        enabled: facility.enabled,
        selected: false,
        constructionProgress: 1,
        presentation: authored ? 'commercial' : 'standard'
      });
      const bodyWidth = authored ? commercialFacilityWidth(facility) : 174 * facility.scale;
      const shadowWidth = authored ? bodyWidth * 0.88 : 150 * facility.scale;
      this.addAssetObject({
        assetId: visual.shadowAssetId,
        point: { ...facility, elevation: Math.max(0, facility.elevation - 0.8) },
        width: shadowWidth,
        anchorY: 0.55,
        generation,
        layer: this.layerManager.layers.buildingShadows,
        alpha: 0.58,
        placeholderColor: 0x000000
      });
      this.addAssetObject({
        assetId: visual.bodyAssetId,
        point: facility,
        width: bodyWidth,
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
          width: (authored ? 144 : 130) * facility.scale,
          anchorY: 0.66,
          generation,
          layer: this.layerManager.layers.effects,
          alpha: state.placement ? 0.62 : 0.48,
          placeholderColor: 0x4ad7ff
        });
      }
    }
  }

  private addFacilityLot(facility: FacilitySceneState, generation: number): void {
    const assetId = facility.category === 'storage'
      ? 'world_terrain_utility_lot'
      : facility.configId.includes('solar') || facility.configId.includes('wind')
        ? 'world_terrain_grass_clean'
        : 'world_terrain_industrial_lot';
    this.addTileAsset({
      assetId,
      point: { ...facility, elevation: -0.08 },
      width: 162 * facility.scale,
      generation,
      alpha: 0.92,
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
      const overlay = this.roundedDiamond(plot, 4.6 * plot.scale, 4.6 * plot.scale)
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
