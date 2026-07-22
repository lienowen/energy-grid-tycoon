import type { CitySceneState } from '../../presentation/CitySceneMapper';
import { AssetManager } from '../../resources/AssetManager';
import { HologramCanvasRenderer, type HologramHitRegion } from './HologramCanvasRenderer';
import {
  distanceBetween,
  pointInPolygon,
  type HologramViewport,
  type SandboxCameraState,
  type ScreenPoint
} from './HologramGeometry';

export interface HologramSandboxActions {
  onPlotClick: (plotId: string) => void;
  onFacilityClick: (instanceId: string) => void;
}

interface PointerState extends ScreenPoint {
  startX: number;
  startY: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class HologramSandbox {
  private readonly canvas = document.createElement('canvas');
  private readonly renderer = new HologramCanvasRenderer();
  private readonly images = new Map<string, HTMLImageElement | null>();
  private readonly pointers = new Map<number, PointerState>();
  private readonly constructionStartedAt = new Map<string, number>();
  private readonly camera: SandboxCameraState = { zoom: 1, offsetX: 0, offsetY: 18 };
  private viewport: HologramViewport = { width: 1, height: 1 };
  private context?: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private state?: CitySceneState;
  private hits: HologramHitRegion[] = [];
  private hovered?: { kind: HologramHitRegion['kind']; id: string };
  private frameId?: number;
  private mounted = false;
  private initializedFacilities = false;
  private dragging = false;
  private pinchDistance?: number;
  private pinchStartZoom = 1;

  constructor(
    private readonly container: HTMLElement,
    private readonly actions: HologramSandboxActions
  ) {}

  mount(): void {
    if (this.mounted) return;
    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('This browser cannot create the city hologram canvas');
    this.context = context;
    this.canvas.className = 'hologram-sandbox-canvas';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'application');
    this.canvas.setAttribute('aria-label', '可拖动、缩放并建设设施的城市全息沙盘');
    this.container.replaceChildren(this.canvas);

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.mounted = true;
    this.frameId = requestAnimationFrame(this.renderFrame);
  }

  destroy(): void {
    if (!this.mounted) return;
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.pointers.clear();
    this.container.replaceChildren();
    this.mounted = false;
  }

  setState(next: CitySceneState): void {
    const nextIds = new Set(next.facilities.map((facility) => facility.instanceId));
    if (this.initializedFacilities) {
      const previousIds = new Set(this.state?.facilities.map((facility) => facility.instanceId) ?? []);
      const now = performance.now();
      for (const id of nextIds) {
        if (!previousIds.has(id)) this.constructionStartedAt.set(id, now);
      }
    } else {
      this.initializedFacilities = true;
    }
    for (const id of [...this.constructionStartedAt.keys()]) {
      if (!nextIds.has(id)) this.constructionStartedAt.delete(id);
    }

    const levelChanged = this.state?.levelId !== next.levelId;
    this.state = next;
    if (levelChanged) this.focusHome();
  }

  focusHome(): void {
    if (!this.state) return;
    this.camera.zoom = this.state.camera.startZoom;
    this.camera.offsetX = this.state.camera.startOffsetX;
    this.camera.offsetY = this.state.camera.startOffsetY;
  }

  zoomBy(factor: number): void {
    if (!this.state) return;
    this.camera.zoom = clamp(
      this.camera.zoom * factor,
      this.state.camera.minZoom,
      this.state.camera.maxZoom
    );
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.viewport = { width, height };
  }

  private readonly renderFrame = (now: number): void => {
    if (!this.mounted) return;
    if (this.context && this.state) {
      this.hits = this.renderer.render({
        context: this.context,
        viewport: this.viewport,
        state: this.state,
        camera: this.camera,
        now,
        hovered: this.hovered,
        constructionStartedAt: this.constructionStartedAt,
        resolveImage: (assetId) => this.resolveImage(assetId)
      });
      for (const [id, startedAt] of this.constructionStartedAt) {
        if (now - startedAt > 1100) this.constructionStartedAt.delete(id);
      }
    }
    this.frameId = requestAnimationFrame(this.renderFrame);
  };

  private resolveImage(assetId: string): HTMLImageElement | undefined {
    const existing = this.images.get(assetId);
    if (existing !== undefined) return existing ?? undefined;
    const src = AssetManager.get(assetId, '');
    if (!src || !src.startsWith('/')) {
      this.images.set(assetId, null);
      return undefined;
    }
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => this.images.set(assetId, image);
    image.onerror = () => this.images.set(assetId, null);
    image.src = src;
    this.images.set(assetId, image);
    return image;
  }

  private getCanvasPoint(event: PointerEvent | WheelEvent): ScreenPoint {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private findHit(point: ScreenPoint): HologramHitRegion | undefined {
    return [...this.hits].reverse().find((hit) => pointInPolygon(point, hit.polygon));
  }

  private updateHover(point: ScreenPoint): void {
    const hit = this.findHit(point);
    this.hovered = hit ? { kind: hit.kind, id: hit.id } : undefined;
    this.canvas.style.cursor = hit?.enabled ? 'pointer' : this.dragging ? 'grabbing' : 'grab';
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const point = this.getCanvasPoint(event);
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, {
      ...point,
      startX: point.x,
      startY: point.y
    });
    this.dragging = false;
    if (this.pointers.size === 2) {
      const pointers = [...this.pointers.values()];
      const first = pointers[0];
      const second = pointers[1];
      if (first && second) {
        this.pinchDistance = distanceBetween(first, second);
        this.pinchStartZoom = this.camera.zoom;
      }
    }
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const point = this.getCanvasPoint(event);
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) {
      this.updateHover(point);
      return;
    }

    const previous = { x: pointer.x, y: pointer.y };
    pointer.x = point.x;
    pointer.y = point.y;
    if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 4) this.dragging = true;

    if (this.pointers.size >= 2 && this.state) {
      const pointers = [...this.pointers.values()];
      const first = pointers[0];
      const second = pointers[1];
      if (first && second && this.pinchDistance && this.pinchDistance > 0) {
        const distance = distanceBetween(first, second);
        this.camera.zoom = clamp(
          this.pinchStartZoom * distance / this.pinchDistance,
          this.state.camera.minZoom,
          this.state.camera.maxZoom
        );
      }
    } else {
      this.camera.offsetX += point.x - previous.x;
      this.camera.offsetY += point.y - previous.y;
      this.constrainCamera();
    }
    this.canvas.style.cursor = 'grabbing';
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const point = this.getCanvasPoint(event);
    const pointer = this.pointers.get(event.pointerId);
    const wasClick = Boolean(pointer && !this.dragging && this.pointers.size === 1);
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = undefined;
    if (this.pointers.size === 0) this.dragging = false;

    if (wasClick) {
      const hit = this.findHit(point);
      if (hit?.enabled) {
        if (hit.kind === 'plot') this.actions.onPlotClick(hit.id);
        else this.actions.onFacilityClick(hit.id);
      }
    }
    this.updateHover(point);
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.state) return;
    event.preventDefault();
    const before = this.camera.zoom;
    const factor = Math.exp(-event.deltaY * 0.0012);
    this.camera.zoom = clamp(
      before * factor,
      this.state.camera.minZoom,
      this.state.camera.maxZoom
    );
    const point = this.getCanvasPoint(event);
    const ratio = this.camera.zoom / before;
    this.camera.offsetX = point.x - this.viewport.width * 0.5
      - (point.x - this.viewport.width * 0.5 - this.camera.offsetX) * ratio;
    this.camera.offsetY = point.y - this.viewport.height * 0.52
      - (point.y - this.viewport.height * 0.52 - this.camera.offsetY) * ratio;
    this.constrainCamera();
  };

  private readonly handleDoubleClick = (): void => this.focusHome();

  private constrainCamera(): void {
    const maxX = this.viewport.width * 0.34;
    const maxY = this.viewport.height * 0.28;
    this.camera.offsetX = clamp(this.camera.offsetX, -maxX, maxX);
    this.camera.offsetY = clamp(this.camera.offsetY, -maxY, maxY);
  }
}
