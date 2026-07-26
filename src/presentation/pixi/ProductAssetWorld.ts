import type { CitySceneState, RoadSceneState, ScenePoint } from '../CitySceneMapper';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { City01ProductPixiWorld } from './City01ProductPixiWorld';
import { ImmersivePixiWorld } from './ImmersivePixiWorld';

type ProductRendererMode = 'city01-product' | 'immersive';

const CITY01_OFFSET_X = 55;
const CITY01_OFFSET_Z = 49;
const DISTRICT_PAD_WIDTH = 1;
const DISTRICT_PAD_DEPTH = 1;

const CITY01_DISTRICT_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'dawn-commercial': { x: 51, z: 48 },
  'dawn-residential': { x: 67, z: 36 },
  'dawn-public': { x: 33, z: 55 },
  'dawn-industrial': { x: 69, z: 58 },
  'dawn-old-town': { x: 46, z: 68 }
};

const CITY01_PLOT_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'sunrise-neighborhood': { x: 27, z: 34 },
  'south-outskirts': { x: 38, z: 28 },
  'north-outskirts': { x: 51, z: 19 },
  'east-coast': { x: 82, z: 29 },
  'west-industry': { x: 23, z: 70 },
  'south-neighborhood': { x: 39, z: 78 },
  'central-utility': { x: 83, z: 42 },
  'east-industry': { x: 88, z: 58 }
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

const roadPoint = (x: number, z: number): ScenePoint => ({ x, z, elevation: -0.02 });

const city01Roads = (powered: boolean): RoadSceneState[] => [
  {
    id: 'city01-west-generation-link',
    laneCount: 1,
    traffic: 0.32,
    powered,
    points: [roadPoint(27, 34), roadPoint(39, 41), roadPoint(51, 48)]
  },
  {
    id: 'city01-east-generation-link',
    laneCount: 1,
    traffic: 0.3,
    powered,
    points: [roadPoint(82, 29), roadPoint(68, 38), roadPoint(57, 46)]
  },
  {
    id: 'city01-industrial-corridor',
    laneCount: 2,
    traffic: 0.68,
    powered,
    points: [roadPoint(51, 48), roadPoint(69, 58), roadPoint(88, 58)]
  },
  {
    id: 'city01-south-service-link',
    laneCount: 1,
    traffic: 0.38,
    powered,
    points: [roadPoint(39, 78), roadPoint(46, 68), roadPoint(69, 58)]
  }
];

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
      focus: { x: 55, z: 51, elevation: 0 },
      camera: {
        ...next.camera,
        startZoom: diagnostics ? 0.98 : 1.04,
        minZoom: Math.min(next.camera.minZoom, 0.68),
        startOffsetX: 30,
        startOffsetY: 18,
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
          scale: originalVisualWidth * 1.25 / DISTRICT_PAD_WIDTH
        };
      }),
      facilities: next.facilities.map((facility) => placeAt(
        shiftPoint(facility),
        CITY01_PLOT_POSITIONS[facility.plotId]
      )),
      plots: shiftedPlots,
      roads: city01Roads(next.supplyRatio > 0.35),
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
