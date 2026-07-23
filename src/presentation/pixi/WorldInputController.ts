import { WorldCamera } from './WorldCamera';

interface PointerSample {
  x: number;
  y: number;
  startX: number;
  startY: number;
}

const distance = (left: PointerSample, right: PointerSample): number =>
  Math.hypot(left.x - right.x, left.y - right.y);

const midpoint = (left: PointerSample, right: PointerSample): { x: number; y: number } => ({
  x: (left.x + right.x) / 2,
  y: (left.y + right.y) / 2
});

export class WorldInputController {
  private readonly pointers = new Map<number, PointerSample>();
  private pinchDistance?: number;
  private pinchMidpoint?: { x: number; y: number };
  private velocityX = 0;
  private velocityY = 0;
  private frameId?: number;
  private suppressTapUntil = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: WorldCamera
  ) {}

  mount(): void {
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.frameId = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.pointers.clear();
  }

  canActivateObject(): boolean {
    return performance.now() >= this.suppressTapUntil;
  }

  private point(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const point = this.point(event);
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { ...point, startX: point.x, startY: point.y });
    this.velocityX = 0;
    this.velocityY = 0;
    if (this.pointers.size === 2) this.beginPinch();
  };

  private beginPinch(): void {
    const [first, second] = [...this.pointers.values()];
    if (!first || !second) return;
    this.pinchDistance = Math.max(1, distance(first, second));
    this.pinchMidpoint = midpoint(first, second);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const sample = this.pointers.get(event.pointerId);
    if (!sample) return;
    const point = this.point(event);
    const deltaX = point.x - sample.x;
    const deltaY = point.y - sample.y;
    sample.x = point.x;
    sample.y = point.y;

    if (this.pointers.size >= 2) {
      const [first, second] = [...this.pointers.values()];
      if (!first || !second || !this.pinchDistance) return;
      const nextDistance = Math.max(1, distance(first, second));
      const nextMidpoint = midpoint(first, second);
      if (this.pinchMidpoint) {
        this.camera.panBy(
          nextMidpoint.x - this.pinchMidpoint.x,
          nextMidpoint.y - this.pinchMidpoint.y
        );
      }
      this.camera.zoomBy(nextDistance / this.pinchDistance, nextMidpoint.x, nextMidpoint.y);
      this.pinchDistance = nextDistance;
      this.pinchMidpoint = nextMidpoint;
      return;
    }

    this.camera.panBy(deltaX, deltaY);
    this.velocityX = this.velocityX * 0.35 + deltaX * 0.65;
    this.velocityY = this.velocityY * 0.35 + deltaY * 0.65;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const sample = this.pointers.get(event.pointerId);
    if (sample && Math.hypot(sample.x - sample.startX, sample.y - sample.startY) > 5) {
      this.suppressTapUntil = performance.now() + 120;
    }
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) {
      this.pinchDistance = undefined;
      this.pinchMidpoint = undefined;
    }
    if (this.pointers.size === 1) this.beginPinch();
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const point = this.point(event);
    this.camera.zoomBy(Math.exp(-event.deltaY * 0.0012), point.x, point.y);
  };

  private readonly onDoubleClick = (): void => this.camera.focusHome();

  private readonly tick = (): void => {
    if (this.pointers.size === 0 && Math.abs(this.velocityX) + Math.abs(this.velocityY) >= 0.08) {
      this.camera.panBy(this.velocityX, this.velocityY);
      this.velocityX *= 0.9;
      this.velocityY *= 0.9;
    }
    this.frameId = requestAnimationFrame(this.tick);
  };
}
