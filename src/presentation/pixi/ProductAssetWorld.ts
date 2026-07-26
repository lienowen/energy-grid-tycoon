import type { CitySceneState, ScenePoint } from '../CitySceneMapper';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { City01ProductPixiWorld } from './City01ProductPixiWorld';
import { ImmersivePixiWorld } from './ImmersivePixiWorld';

type ProductRendererMode = 'city01-product' | 'immersive';

const CITY01_OFFSET_X = 55;
const CITY01_OFFSET_Z = 49;
const DISTRICT_PAD_WIDTH = 1;
const DISTRICT_PAD_DEPTH = 1;

const CITY01_DISTRICT_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'dawn-residential': { x: 56, z: 32 },
  'dawn-commercial': { x: 38, z: 47 },
  'dawn-industrial': { x: 75, z: 51 },
  'dawn-public': { x: 48, z: 64 },
  'dawn-old-town': { x: 76, z: 66 }
};

const CITY01_PLOT_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'sunrise-neighborhood': { x: 31, z: 36 },
  'south-outskirts': { x: 42, z: 34 },
  'north-outskirts': { x: 49, z: 23 },
  'east-coast': { x: 76, z: 31 },
  'west-industry': { x: 29, z: 64 },
  'south-neighborhood': { x: 42, z: 69 },
  'central-utility': { x: 75, z: 38 },
  'east-industry': { x: 83, z: 51 }
};

const shiftPoint = <T extends ScenePoint>(point: T): T => ({
  ...point,
  x: point.x + CITY01_OFFSET_X,
  z: point.z + CITY01_OFFSET_Z
});

const placeAt = <T extends ScenePoint>(
  point: T,
  position: Pick<ScenePoint, 'x' | 'z'> | undefined
): T => position ? { ...point, ...position } : point;

export class ProductAssetWorld implements WorldRenderSurface {
  private renderer?: WorldRenderSurface;
  private mode?: ProductRendererMode;
  private mounted = false;
  private lastState?: CitySceneState;

  constructor(
    private readonly container: HTMLElement,
    private readonly actions: WorldRenderActions
  ) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.ensureRenderer(this.lastState?.levelId === 'city-01' ? 'city01-product' : 'immersive');
    this.renderer?.mount();
    if (this.lastState) this.renderer?.setState(this.lastState);
  }

  destroy(): void {
    this.mounted = false;
    this.renderer?.destroy();
    this.renderer = undefined;
    this.mode = undefined;
    this.lastState = undefined;
    this.container.replaceChildren();
  }

  setState(next: CitySceneState): void {
    const renderedState = next.levelId === 'city-01' ? this.city01State(next) : next;
    this.lastState = renderedState;
    const nextMode: ProductRendererMode = next.levelId === 'city-01'
      ? 'city01-product'
      : 'immersive';
    const changed = this.ensureRenderer(nextMode);
    if (changed && this.mounted) this.renderer?.mount();
    this.renderer?.setState(renderedState);
  }

  focusHome(): void {
    this.renderer?.focusHome();
  }

  zoomBy(factor: number): void {
    this.renderer?.zoomBy(factor);
  }

  private city01State(next: CitySceneState): CitySceneState {
    const diagnostics = next.presentationMode === 'grid';
    const shiftedPlots = next.plots.map((plot) => placeAt(
      shiftPoint(plot),
      CITY01_PLOT_POSITIONS[plot.id]
    ));

    return {
      ...next,
      city: shiftPoint(next.city),
      focus: { x: 56, z: 49, elevation: 0 },
      camera: {
        ...next.camera,
        startZoom: diagnostics ? 1.02 : 1.1,
        minZoom: Math.min(next.camera.minZoom, 0.7),
        startOffsetX: 22,
        startOffsetY: 20,
        panLimitX: Math.max(next.camera.panLimitX ?? 170, 230),
        panLimitY: Math.max(next.camera.panLimitY ?? 120, 180)
      },
      districtPrefabs: next.districtPrefabs?.map((district) => {
        const shifted = placeAt(shiftPoint(district), CITY01_DISTRICT_POSITIONS[district.id]);
        const originalVisualWidth = district.width * district.scale;
        return {
          ...shifted,
          width: DISTRICT_PAD_WIDTH,
          depth: DISTRICT_PAD_DEPTH,
          scale: originalVisualWidth * 0.92 / DISTRICT_PAD_WIDTH
        };
      }),
      facilities: next.facilities.map((facility) => placeAt(
        shiftPoint(facility),
        CITY01_PLOT_POSITIONS[facility.plotId]
      )),
      plots: shiftedPlots,
      roads: next.roads.map((road) => ({
        ...road,
        points: road.points.map((point) => shiftPoint(point))
      })),
      networkNodes: next.networkNodes?.map((node) => shiftPoint(node)),
      networkEdges: diagnostics
        ? next.networkEdges
          ?.filter((edge) =>
            edge.status === 'offline'
            || edge.status === 'overload'
            || edge.loadRatio > 0.025
          )
          .map((edge) => ({
            ...edge,
            points: edge.points.map((point) => shiftPoint(point))
          }))
        : []
    };
  }

  private ensureRenderer(nextMode: ProductRendererMode): boolean {
    if (this.renderer && this.mode === nextMode) return false;
    this.renderer?.destroy();
    this.container.replaceChildren();
    this.mode = nextMode;
    this.renderer = nextMode === 'city01-product'
      ? new City01ProductPixiWorld(this.container, this.actions)
      : new ImmersivePixiWorld(this.container, this.actions);
    return true;
  }
}
