import type {
  CitySceneState,
  DistrictPrefabSceneState,
  EnergyNetworkEdgeSceneState,
  RoadSceneState,
  ScenePoint
} from '../CitySceneMapper';
import type { WorldRenderActions, WorldRenderSurface } from '../../ui/world/WorldRenderSurface';
import { City01ProductPixiWorld } from './City01ProductPixiWorld';
import { ImmersivePixiWorld } from './ImmersivePixiWorld';

type ProductRendererMode = 'city01-product' | 'immersive';

const CITY01_OFFSET_X = 55;
const CITY01_OFFSET_Z = 49;
const DISTRICT_PAD_WIDTH = 1;
const DISTRICT_PAD_DEPTH = 1;

const CITY01_DISTRICT_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'dawn-commercial': { x: 53, z: 50 },
  'dawn-residential': { x: 69, z: 39 },
  'dawn-public': { x: 34, z: 56 },
  'dawn-industrial': { x: 70, z: 64 },
  'dawn-old-town': { x: 46, z: 70 }
};

const CITY01_GRID_DISTRICT_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'dawn-commercial': { x: 43, z: 33 },
  'dawn-residential': { x: 83, z: 38 },
  'dawn-public': { x: 19, z: 52 },
  'dawn-industrial': { x: 88, z: 69 },
  'dawn-old-town': { x: 29, z: 77 }
};

const CITY01_GRID_NODE_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'main-substation': { x: 55, z: 52 },
  'west-distribution': { x: 36, z: 58 },
  'east-distribution': { x: 76, z: 51 }
};

const CITY01_PLOT_POSITIONS: Readonly<Record<string, Pick<ScenePoint, 'x' | 'z'>>> = {
  'sunrise-neighborhood': { x: 31, z: 42 },
  'south-outskirts': { x: 43, z: 38 },
  'north-outskirts': { x: 54, z: 27 },
  'east-coast': { x: 79, z: 37 },
  'west-industry': { x: 25, z: 70 },
  'south-neighborhood': { x: 39, z: 80 },
  'central-utility': { x: 82, z: 45 },
  'east-industry': { x: 87, z: 61 }
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
const gridPoint = (x: number, z: number): ScenePoint => ({ x, z, elevation: 0.34 });

const city01Roads = (powered: boolean): RoadSceneState[] => [
  {
    id: 'city01-west-energy-link',
    laneCount: 1,
    traffic: 0.3,
    powered,
    points: [roadPoint(31, 42), roadPoint(42, 46), roadPoint(53, 50)]
  },
  {
    id: 'city01-east-energy-link',
    laneCount: 1,
    traffic: 0.28,
    powered,
    points: [roadPoint(79, 37), roadPoint(68, 43), roadPoint(57, 49)]
  },
  {
    id: 'city01-industrial-access',
    laneCount: 2,
    traffic: 0.62,
    powered,
    points: [roadPoint(53, 50), roadPoint(70, 64), roadPoint(87, 61)]
  }
];

const gridEdgeRoute = (edge: EnergyNetworkEdgeSceneState): ScenePoint[] | undefined => {
  const routes: Readonly<Record<string, readonly ScenePoint[]>> = {
    'solar-to-main': [gridPoint(31, 42), gridPoint(43, 46), gridPoint(55, 52)],
    'reserve-to-main': [gridPoint(25, 70), gridPoint(40, 63), gridPoint(55, 52)],
    'main-to-west': [gridPoint(55, 52), gridPoint(46, 54), gridPoint(36, 58)],
    'west-to-east': [gridPoint(36, 58), gridPoint(55, 65), gridPoint(76, 51)],
    'wind-to-east': [gridPoint(79, 37), gridPoint(80, 44), gridPoint(76, 51)],
    'storage-to-east': [gridPoint(82, 45), gridPoint(80, 48), gridPoint(76, 51)],
    'west-to-residential': [gridPoint(36, 58), gridPoint(56, 44), gridPoint(83, 38)],
    'west-to-commercial': [gridPoint(36, 58), gridPoint(38, 44), gridPoint(43, 33)],
    'west-to-public': [gridPoint(36, 58), gridPoint(27, 57), gridPoint(19, 52)],
    'east-to-industrial': [gridPoint(76, 51), gridPoint(88, 56), gridPoint(88, 69)],
    'west-to-industrial-tie': [gridPoint(76, 51), gridPoint(68, 76), gridPoint(88, 69)],
    'east-to-public': [gridPoint(76, 51), gridPoint(57, 71), gridPoint(36, 69), gridPoint(19, 52)],
    'east-to-old-town': [gridPoint(76, 51), gridPoint(57, 74), gridPoint(29, 77)]
  };
  const route = routes[edge.id];
  return route ? route.map((point) => ({ ...point })) : undefined;
};

const visualDistrict = (
  source: DistrictPrefabSceneState | undefined,
  id: string,
  x: number,
  z: number,
  scaleFactor: number
): DistrictPrefabSceneState | undefined => source ? {
  ...source,
  id,
  label: '',
  x,
  z,
  width: DISTRICT_PAD_WIDTH,
  depth: DISTRICT_PAD_DEPTH,
  scale: source.scale * scaleFactor,
  powerRatio: 1,
  status: 'normal'
} : undefined;

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
    const districtPositions = diagnostics
      ? CITY01_GRID_DISTRICT_POSITIONS
      : CITY01_DISTRICT_POSITIONS;
    const shiftedPlots = next.plots.map((plot) => placeAt(
      shiftPoint(plot),
      CITY01_PLOT_POSITIONS[plot.id]
    ));
    const primaryDistricts = (next.districtPrefabs ?? []).map((district) => {
      const shifted = placeAt(shiftPoint(district), districtPositions[district.id]);
      const originalVisualWidth = district.width * district.scale;
      return {
        ...shifted,
        width: DISTRICT_PAD_WIDTH,
        depth: DISTRICT_PAD_DEPTH,
        scale: originalVisualWidth * (diagnostics ? 0.82 : 1.2) / DISTRICT_PAD_WIDTH
      };
    });
    const primaryByKind = new Map(primaryDistricts.map((district) => [district.kind, district]));
    const fillerDistricts = diagnostics ? [] : [
      visualDistrict(primaryByKind.get('residential'), 'city01-visual-residential-a', 57, 43, 0.48),
      visualDistrict(primaryByKind.get('commercial'), 'city01-visual-commercial-a', 43, 60, 0.42),
      visualDistrict(primaryByKind.get('public'), 'city01-visual-public-a', 59, 68, 0.4),
      visualDistrict(primaryByKind.get('old_town'), 'city01-visual-old-town-a', 34, 70, 0.36),
      visualDistrict(primaryByKind.get('residential'), 'city01-visual-residential-b', 73, 49, 0.38),
      visualDistrict(primaryByKind.get('commercial'), 'city01-visual-commercial-b', 55, 75, 0.34)
    ].filter((district): district is DistrictPrefabSceneState => Boolean(district));

    return {
      ...next,
      city: shiftPoint(next.city),
      focus: { x: 55, z: diagnostics ? 57 : 56, elevation: 0 },
      camera: {
        ...next.camera,
        startZoom: diagnostics ? 1.13 : 1.48,
        minZoom: Math.min(next.camera.minZoom, 0.76),
        maxZoom: Math.max(next.camera.maxZoom, 2.2),
        startOffsetX: diagnostics ? 90 : 96,
        startOffsetY: diagnostics ? 16 : 18,
        panLimitX: Math.max(next.camera.panLimitX ?? 170, 260),
        panLimitY: Math.max(next.camera.panLimitY ?? 120, 200)
      },
      districtPrefabs: [...primaryDistricts, ...fillerDistricts],
      facilities: next.facilities.map((facility) => ({
        ...placeAt(shiftPoint(facility), CITY01_PLOT_POSITIONS[facility.plotId]),
        scale: facility.scale * 0.62
      })),
      plots: shiftedPlots,
      roads: diagnostics ? [] : city01Roads(next.supplyRatio > 0.35),
      networkNodes: diagnostics
        ? next.networkNodes?.map((node) => placeAt(
          shiftPoint(node),
          CITY01_GRID_NODE_POSITIONS[node.id]
        ))
        : [],
      networkEdges: diagnostics
        ? next.networkEdges
          ?.filter((edge) =>
            edge.status === 'offline'
            || edge.status === 'overload'
            || edge.loadRatio > 0.08
          )
          .map((edge) => ({
            ...edge,
            points: gridEdgeRoute(edge) ?? edge.points.map((point) => shiftPoint(point))
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
