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

const SCENE_UNITS_PER_GRID = 10;
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;
const ELEVATION_HEIGHT = 11.5;

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

const toColor = (value: string, fallback = 0x4ad7ff): number => {
  const normalized = value.trim().replace('#', '');
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class PixiGameWorld implements WorldRenderSurface {
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
    void this.initialize().catch((error: unknown) => {
      console.error('Pixi city renderer failed to initialize:', error);
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
    this.camera.configure(this.state.camera);
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
      backgroundColor: 0x03101c,
      antialias: true,
      preference: 'webgl',
      powerPreference: 'high-performance'
    });
    if (!this.mounted) {
      this.app.destroy({ removeView: true }, { children: true, context: true });
      return;
    }

    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.className = 'hologram-sandbox-canvas pixi-world-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'PixiJS 城市经营世界，可拖动、缩放和选择设施');
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
    this.drawGround(accent);
    this.drawDistricts(state, accent);
    this.drawRoads(state);
    this.drawAmbientBlocks(state, generation);
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

  private drawGround(accent: number): void {
    const ground = new Graphics()
      .poly(this.diamondPoints({ x: 50, z: 50, elevation: 0 }, 58, 58))
      .fill({ color: 0x0c2731, alpha: 0.98 })
      .stroke({ color: accent, alpha: 0.55, width: 3 });
    ground.zIndex = 0;
    this.layerManager.layers.terrain.addChild(ground);
  }

  private drawDistricts(state: CitySceneState, accent: number): void {
    for (const district of state.districts) {
      const color = district.powerRatio < 0.85 ? 0xff667f : accent;
      const shape = new Graphics()
        .poly(this.diamondPoints(district, district.radiusX, district.radiusZ))
        .fill({ color, alpha: 0.035 + district.powerRatio * 0.035 })
        .stroke({ color, alpha: 0.18, width: 1 });
      shape.zIndex = this.depth(district);
      this.layerManager.layers.terrain.addChild(shape);
    }
  }

  private drawRoads(state: CitySceneState): void {
    for (const road of state.roads) {
      const first = road.points[0];
      if (!first) continue;
      const start = this.project(first);
      const asphalt = new Graphics().moveTo(start.x, start.y);
      for (const point of road.points.slice(1)) {
        const projected = this.project(point);
        asphalt.lineTo(projected.x, projected.y);
      }
      asphalt.stroke({
        color: road.powered ? 0x334854 : 0x252d34,
        width: road.laneCount === 2 ? 28 : 18,
        cap: 'round',
        join: 'round'
      });
      asphalt.zIndex = this.depth(first);
      this.layerManager.layers.roads.addChild(asphalt);

      const marking = new Graphics().moveTo(start.x, start.y);
      for (const point of road.points.slice(1)) {
        const projected = this.project(point);
        marking.lineTo(projected.x, projected.y);
      }
      marking.stroke({ color: 0xd7edf4, alpha: 0.36, width: 2 });
      marking.zIndex = this.depth(first, 1);
      this.layerManager.layers.roads.addChild(marking);
    }
  }

  private drawAmbientBlocks(state: CitySceneState, generation: number): void {
    const suffix = state.blackoutIntensity > 0.45
      ? 'blackout'
      : state.hour < 6 || state.hour >= 18
        ? 'night'
        : 'day';

    for (const block of state.ambientBlocks) {
      if (block.kind === 'park') {
        this.addPark(block);
        continue;
      }
      const pool = buildingAssets[block.kind];
      const selected = pool[Math.abs(block.lightSeed) % pool.length];
      if (!selected) continue;
      const assetId = `world_building_${selected}_${suffix}`;
      const width = Math.max(74, Math.min(148, 62 + block.width * 5.2));
      this.addAssetObject({
        assetId,
        point: block,
        width,
        anchorY: 0.82,
        generation,
        layer: this.layerManager.layers.buildings,
        placeholderColor: block.kind === 'industrial' ? 0xff965c : 0x4ad7ff
      });
    }
  }

  private addPark(block: AmbientBlockSceneState): void {
    const position = this.project(block);
    const park = new Graphics()
      .ellipse(0, 0, Math.max(22, block.width * 2.4), Math.max(12, block.depth * 1.4))
      .fill({ color: 0x2f8f70, alpha: 0.72 })
      .stroke({ color: 0x78e0ba, alpha: 0.45, width: 1 });
    park.position.set(position.x, position.y);
    park.zIndex = this.depth(block);
    this.layerManager.layers.groundDecorations.addChild(park);
  }

  private drawFacilities(state: CitySceneState, generation: number): void {
    for (const facility of state.facilities) {
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
        width: 128 * facility.scale,
        anchorY: 0.55,
        generation,
        layer: this.layerManager.layers.buildingShadows,
        alpha: 0.65,
        placeholderColor: 0x000000
      });
      this.addAssetObject({
        assetId: visual.bodyAssetId,
        point: facility,
        width: 142 * facility.scale,
        anchorY: 0.84,
        generation,
        layer: this.layerManager.layers.buildings,
        placeholderColor: 0x78dfff,
        onActivate: () => this.actions.onFacilityClick(facility.instanceId)
      });
      if (visual.lightAssetId) {
        this.addAssetObject({
          assetId: visual.lightAssetId,
          point: facility,
          width: 112 * facility.scale,
          anchorY: 0.66,
          generation,
          layer: this.layerManager.layers.effects,
          alpha: 0.62,
          placeholderColor: 0x4ad7ff
        });
      }
    }
  }

  private drawEnergyLinks(state: CitySceneState, accent: number): void {
    for (const link of state.links) {
      const from = this.project(link.from);
      const to = this.project(link.to);
      const beam = new Graphics()
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({
          color: link.active ? accent : 0x56636c,
          alpha: 0.1 + link.intensity * 0.24,
          width: link.active ? 2 : 1
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
        .fill({ color, alpha: plot.available ? 0.19 : 0.06 })
        .stroke({ color, alpha: plot.available ? 0.92 : 0.34, width: plot.available ? 3 : 1 });
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
      .fill({ color: options.placeholderColor, alpha: 0.28 })
      .stroke({ color: options.placeholderColor, alpha: 0.62, width: 1 });
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
      const sprite = this.makeSprite(texture, options.width, options.anchorY, options.alpha ?? 1);
      slot.addChild(sprite);
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
