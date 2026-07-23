import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { CityPlotConfig } from '../core/CityMapConfig';
import type { GameViewModel } from '../core/GameManager';
import { CityMapSystem } from '../systems/CityMapSystem';
import { LevelLoader } from '../systems/LevelLoader';
import {
  calculateCityGrowth,
  makeCitizenFeedback,
  makeExpansionSites
} from './CityFeedbackVisuals';
import {
  makeAmbientBlocks,
  makeDistricts,
  makeRoads,
  toScenePoint
} from './CitySceneVisuals';
import type {
  CitySceneState,
  DistrictPrefabSceneState,
  DistrictPrefabStatus,
  EnergyLinkSceneState,
  EnergyNetworkEdgeSceneState,
  EnergyNetworkNodeSceneState,
  EnergyNetworkNodeStatus,
  EnvironmentPrefabSceneState,
  FacilitySceneState,
  HologramCameraConfig,
  PlotSceneState,
  RoadSceneState
} from './CitySceneTypes';
import type { LevelSceneLayout } from './layout/LevelSceneLayout';
import { LevelSceneLayoutRegistry } from './layout/LevelSceneLayoutRegistry';

export type {
  AmbientBlockKind,
  AmbientBlockSceneState,
  CitizenFeedbackSceneState,
  CitizenFeedbackTone,
  CityGrowthSceneState,
  CityScenePlacementState,
  CitySceneState,
  DistrictPrefabSceneState,
  DistrictPrefabStatus,
  DistrictSceneState,
  EnergyLinkSceneState,
  EnergyNetworkEdgeSceneState,
  EnergyNetworkEdgeStatus,
  EnergyNetworkNodeSceneState,
  EnergyNetworkNodeStatus,
  EnvironmentPrefabSceneState,
  ExpansionSiteSceneState,
  FacilitySceneState,
  HologramCameraConfig,
  PlotSceneState,
  RoadSceneState,
  ScenePoint
} from './CitySceneTypes';

const zoneLabels = {
  neighborhood: '居民社区',
  industrial: '产业区',
  coastal: '海岸能源区',
  outskirts: '城市边缘',
  utility: '公共服务区'
} as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getFacilityOutput = (building: BuildingBase, view: GameViewModel): number => {
  if (building.config.category === 'storage') {
    return building.getStorageCapacity(view.modifiers.storageCapacityMultiplier);
  }
  return building.getPowerOutput(view.modifiers.generationMultiplier);
};

const getStorageRatio = (building: BuildingBase, view: GameViewModel): number => {
  if (building.config.category !== 'storage') return 0;
  const capacity = building.getStorageCapacity(view.modifiers.storageCapacityMultiplier);
  return capacity > 0 ? clamp(building.storedEnergy / capacity, 0, 1) : 0;
};

const getCamera = (view: GameViewModel, layout?: LevelSceneLayout): HologramCameraConfig => {
  if (layout) return { ...layout.camera };
  const sandbox = view.level.presentation?.world?.sandbox;
  return {
    startZoom: clamp(sandbox?.startZoom ?? 1, 0.55, 2.4),
    minZoom: clamp(sandbox?.minZoom ?? 0.72, 0.45, 1.5),
    maxZoom: clamp(sandbox?.maxZoom ?? 1.75, 1, 3),
    startOffsetX: sandbox?.startOffsetX ?? 0,
    startOffsetY: sandbox?.startOffsetY ?? 18,
    panLimitX: 420,
    panLimitY: 280
  };
};

const findPlotAnchor = (layout: LevelSceneLayout | undefined, plotId: string) =>
  layout?.plotAnchors?.find((anchor) => anchor.plotId === plotId);

const mapFacilities = (
  view: GameViewModel,
  plots: readonly CityPlotConfig[],
  layout?: LevelSceneLayout
): FacilitySceneState[] => view.buildings
  .filter((building): building is BuildingBase & { placementId: string } => Boolean(building.placementId))
  .map((building): FacilitySceneState | undefined => {
    const plot = plots.find((candidate) => candidate.id === building.placementId);
    if (!plot) return undefined;
    const anchor = findPlotAnchor(layout, plot.id);
    const point = toScenePoint(anchor ?? plot);
    return {
      ...point,
      elevation: point.elevation + 1.1,
      instanceId: building.instanceId,
      configId: building.config.id,
      plotId: plot.id,
      name: building.config.name,
      assetId: building.config.assetId,
      category: building.config.category,
      enabled: building.enabled,
      level: building.level,
      scale: (anchor?.scale ?? plot.scale ?? 1) * (1 + (building.level - 1) * 0.06),
      output: getFacilityOutput(building, view),
      storageRatio: getStorageRatio(building, view)
    };
  })
  .filter((facility): facility is FacilitySceneState => Boolean(facility));

const mapPlots = (
  view: GameViewModel,
  plots: readonly CityPlotConfig[],
  facilities: readonly FacilitySceneState[],
  selected: BuildingConfig | undefined,
  layout?: LevelSceneLayout
): PlotSceneState[] => plots.map((plot): PlotSceneState => {
  const occupant = facilities.find((facility) => facility.plotId === plot.id);
  const check = selected
    ? CityMapSystem.canPlace(selected, plot, view.buildings)
    : undefined;
  const anchor = findPlotAnchor(layout, plot.id);
  return {
    ...toScenePoint(anchor ?? plot),
    id: plot.id,
    zone: plot.zone,
    label: plot.label ?? zoneLabels[plot.zone],
    scale: anchor?.scale ?? plot.scale ?? 1,
    locked: Boolean(plot.locked),
    occupied: Boolean(occupant),
    available: Boolean(selected && check?.ok),
    blocked: Boolean(selected && !check?.ok),
    blockedReason: check?.ok ? undefined : check?.reason,
    facilityId: occupant?.instanceId
  };
});

const mapLinks = (
  facilities: readonly FacilitySceneState[],
  city: { x: number; z: number; elevation: number },
  supplyRatio: number
): EnergyLinkSceneState[] => facilities.map((facility): EnergyLinkSceneState => ({
  id: `${facility.instanceId}-city`,
  from: facility,
  to: city,
  active: facility.enabled,
  intensity: facility.enabled ? clamp(supplyRatio, 0.25, 1) : 0.08
}));

const statusForPower = (powerRatio: number): DistrictPrefabStatus => {
  if (powerRatio >= 0.88) return 'normal';
  if (powerRatio >= 0.58) return 'warning';
  if (powerRatio >= 0.16) return 'blackout';
  return 'offline';
};

const mapDistrictPrefabs = (
  layout: LevelSceneLayout,
  supplyRatio: number
): DistrictPrefabSceneState[] => {
  const order = [...layout.districts]
    .sort((left, right) => left.priority - right.priority)
    .map((district) => district.id);
  return layout.districts.map((district) => {
    const rank = Math.max(0, order.indexOf(district.id));
    const powerRatio = clamp(supplyRatio * layout.districts.length - rank, 0, 1);
    return {
      ...toScenePoint(district),
      id: district.id,
      label: district.label,
      kind: district.kind,
      width: district.width,
      depth: district.depth,
      scale: district.scale ?? 1,
      buildingCount: district.buildingCount ?? 5,
      variant: district.variant ?? rank,
      powerRatio,
      status: statusForPower(powerRatio)
    };
  });
};

const mapEnvironment = (layout: LevelSceneLayout): EnvironmentPrefabSceneState[] =>
  layout.environment.map((item) => ({
    ...toScenePoint(item),
    id: item.id,
    kind: item.kind,
    width: item.width,
    depth: item.depth,
    density: item.density ?? 0.7,
    variant: item.variant ?? 0
  }));

const mapAuthoredRoads = (
  layout: LevelSceneLayout,
  population: number,
  supplyRatio: number
): RoadSceneState[] => {
  const traffic = clamp(population / 18000 * (0.45 + supplyRatio * 0.75), 0.08, 1);
  return layout.roads.map((road, index) => ({
    id: road.id,
    points: road.points.map((point) => ({ ...toScenePoint(point), elevation: -0.2 })),
    laneCount: road.laneCount,
    traffic: clamp(traffic * (road.laneCount === 2 ? 0.9 : 0.58) * (1 - index * 0.025), 0.04, 1),
    powered: supplyRatio > 0.35
  }));
};

const districtNodeStatus = (district: DistrictPrefabSceneState): EnergyNetworkNodeStatus => {
  if (district.status === 'offline') return 'offline';
  if (district.status === 'normal') return 'active';
  return 'warning';
};

const mapEnergyNetwork = (
  layout: LevelSceneLayout,
  facilities: readonly FacilitySceneState[],
  districts: readonly DistrictPrefabSceneState[],
  supplyRatio: number,
  demandRatio: number
): {
  nodes: EnergyNetworkNodeSceneState[];
  edges: EnergyNetworkEdgeSceneState[];
} => {
  const pressure = demandRatio / Math.max(0.2, supplyRatio);
  const nodes = layout.energyNetwork.nodes.map((node): EnergyNetworkNodeSceneState => {
    const point = toScenePoint(node);
    if (node.districtId) {
      const district = districts.find((candidate) => candidate.id === node.districtId);
      const status = district ? districtNodeStatus(district) : 'offline';
      return {
        ...point,
        id: node.id,
        label: node.label,
        kind: node.kind,
        status,
        capacity: node.capacity,
        loadRatio: clamp(demandRatio / Math.max(0.25, node.capacity), 0, 1.5),
        districtId: node.districtId
      };
    }

    const matchingFacilities = facilities.filter((facility) =>
      Boolean(node.plotIds?.includes(facility.plotId))
      || Boolean(node.facilityConfigIds?.includes(facility.configId))
    );
    if (matchingFacilities.length > 0) {
      const activeFacilities = matchingFacilities.filter((facility) => facility.enabled);
      const totalOutput = activeFacilities.reduce((sum, facility) => sum + facility.output, 0);
      const status: EnergyNetworkNodeStatus = activeFacilities.length === 0
        ? 'offline'
        : pressure > 1.02
          ? 'warning'
          : 'active';
      return {
        ...point,
        id: node.id,
        label: node.label,
        kind: node.kind,
        status,
        capacity: node.capacity,
        loadRatio: clamp(totalOutput / Math.max(1, node.capacity * 620), 0, 1.5),
        facilityId: matchingFacilities[0]?.instanceId
      };
    }

    if (node.alwaysOperational) {
      const status: EnergyNetworkNodeStatus = supplyRatio < 0.16
        ? 'offline'
        : pressure > 1.02
          ? 'warning'
          : 'active';
      return {
        ...point,
        id: node.id,
        label: node.label,
        kind: node.kind,
        status,
        capacity: node.capacity,
        loadRatio: clamp(pressure / node.capacity, 0, 1.5)
      };
    }

    return {
      ...point,
      id: node.id,
      label: node.label,
      kind: node.kind,
      status: 'planned',
      capacity: node.capacity,
      loadRatio: 0
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = layout.energyNetwork.edges.map((edge): EnergyNetworkEdgeSceneState => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      throw new Error(`Invalid authored energy edge ${edge.id}: ${edge.from} -> ${edge.to}`);
    }
    const loadRatio = clamp(pressure / Math.max(0.2, edge.capacity), 0, 1.6);
    const status = from.status === 'planned' || to.status === 'planned'
      ? 'planned'
      : from.status === 'offline' || to.status === 'offline'
        ? 'offline'
        : loadRatio > 1.02
          ? 'overload'
          : 'normal';
    return {
      id: edge.id,
      fromNodeId: edge.from,
      toNodeId: edge.to,
      points: edge.points?.length
        ? edge.points.map((point) => ({ ...toScenePoint(point), elevation: 0.18 }))
        : [from, to].map((point) => ({ x: point.x, z: point.z, elevation: 0.18 })),
      capacity: edge.capacity,
      loadRatio,
      status
    };
  });

  return { nodes, edges };
};

export class CitySceneMapper {
  static map(view: GameViewModel, selectedBuildingId?: string): CitySceneState {
    const plots = LevelLoader.getWorldPlots(view.level);
    const layout = LevelSceneLayoutRegistry.resolve(view.level.id);
    const selected = selectedBuildingId
      ? view.availableBuildings.find((building) => building.id === selectedBuildingId)
      : undefined;
    const cityConfig = view.level.presentation?.world?.city ?? { x: 50, y: 50 };
    const city = toScenePoint(cityConfig);
    city.elevation = 1.4;

    const supplyRatio = clamp(view.state.supplyRatio, 0, 1);
    const demandRatio = clamp(
      view.state.powerDemand / Math.max(1, view.state.baseDemand),
      0.25,
      2
    );
    const theme = view.level.presentation?.world?.theme ?? 'residential';
    const growth = calculateCityGrowth({
      initialPopulation: view.level.initial.population,
      population: view.state.population,
      day: view.state.day
    });
    const facilities = mapFacilities(view, plots, layout);
    const scenePlots = mapPlots(view, plots, facilities, selected, layout);
    const districts = makeDistricts(
      plots,
      supplyRatio,
      theme,
      view.state.hour,
      demandRatio
    );
    const districtPrefabs = layout ? mapDistrictPrefabs(layout, supplyRatio) : undefined;
    const energyNetwork = layout && districtPrefabs
      ? mapEnergyNetwork(layout, facilities, districtPrefabs, supplyRatio, demandRatio)
      : undefined;
    const roads = layout
      ? mapAuthoredRoads(layout, view.state.population, supplyRatio)
      : makeRoads(
          view.level.id,
          plots,
          city,
          view.state.population,
          supplyRatio,
          growth.progress
        );
    const ambientBlocks = layout
      ? []
      : makeAmbientBlocks(
          view.level.id,
          plots,
          districts,
          theme,
          growth.progress
        );
    const trafficDensity = clamp(
      view.state.population / 18000 * (0.45 + supplyRatio * 0.75),
      0.08,
      1
    );

    const placement = selected
      ? {
          buildingId: selected.id,
          buildingName: selected.name,
          assetId: selected.assetId,
          validPlotIds: scenePlots.filter((plot) => plot.available).map((plot) => plot.id)
        }
      : undefined;

    const scene: CitySceneState = {
      levelId: view.level.id,
      cityName: view.level.name,
      theme,
      accent: view.level.presentation?.accent ?? '#4ad7ff',
      day: view.state.day,
      hour: view.state.hour,
      population: view.state.population,
      satisfaction: view.state.satisfaction,
      pollutionRatio: clamp(view.state.pollution / 100, 0, 1),
      supplyRatio,
      demandRatio,
      blackoutIntensity: clamp((0.97 - supplyRatio) / 0.55, 0, 1),
      trafficDensity,
      city,
      focus: layout ? toScenePoint(layout.focus) : undefined,
      camera: getCamera(view, layout),
      sceneMode: layout ? 'authored' : 'procedural',
      growth,
      districts,
      districtPrefabs,
      environment: layout ? mapEnvironment(layout) : undefined,
      networkNodes: energyNetwork?.nodes,
      networkEdges: energyNetwork?.edges,
      plots: scenePlots,
      facilities,
      links: mapLinks(facilities, city, supplyRatio),
      roads,
      ambientBlocks,
      expansionSites: makeExpansionSites(view.level.id, plots, growth),
      citizenFeedback: makeCitizenFeedback({
        levelId: view.level.id,
        day: view.state.day,
        hour: view.state.hour,
        satisfaction: view.state.satisfaction,
        pollutionRatio: clamp(view.state.pollution / 100, 0, 1),
        supplyRatio,
        demandRatio,
        districts
      }),
      placement
    };
    const backgroundAssetId = view.level.presentation?.backgroundAssetId;
    if (backgroundAssetId) scene.backgroundAssetId = backgroundAssetId;
    return scene;
  }
}
