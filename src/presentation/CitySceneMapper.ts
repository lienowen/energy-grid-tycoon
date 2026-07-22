import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { CityPlotConfig } from '../core/CityMapConfig';
import type { GameViewModel } from '../core/GameManager';
import { CityMapSystem } from '../systems/CityMapSystem';
import { LevelLoader } from '../systems/LevelLoader';
import {
  makeAmbientBlocks,
  makeDistricts,
  makeRoads,
  toScenePoint
} from './CitySceneVisuals';
import type {
  CitySceneState,
  EnergyLinkSceneState,
  FacilitySceneState,
  HologramCameraConfig,
  PlotSceneState
} from './CitySceneTypes';

export type {
  AmbientBlockKind,
  AmbientBlockSceneState,
  CityScenePlacementState,
  CitySceneState,
  DistrictSceneState,
  EnergyLinkSceneState,
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

const getCamera = (view: GameViewModel): HologramCameraConfig => {
  const sandbox = view.level.presentation?.world?.sandbox;
  return {
    startZoom: clamp(sandbox?.startZoom ?? 1, 0.55, 2.4),
    minZoom: clamp(sandbox?.minZoom ?? 0.72, 0.45, 1.5),
    maxZoom: clamp(sandbox?.maxZoom ?? 1.75, 1, 3),
    startOffsetX: sandbox?.startOffsetX ?? 0,
    startOffsetY: sandbox?.startOffsetY ?? 18
  };
};

const mapFacilities = (
  view: GameViewModel,
  plots: readonly CityPlotConfig[]
): FacilitySceneState[] => view.buildings
  .filter((building): building is BuildingBase & { placementId: string } => Boolean(building.placementId))
  .map((building): FacilitySceneState | undefined => {
    const plot = plots.find((candidate) => candidate.id === building.placementId);
    if (!plot) return undefined;
    const point = toScenePoint(plot);
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
      scale: (plot.scale ?? 1) * (1 + (building.level - 1) * 0.06),
      output: getFacilityOutput(building, view),
      storageRatio: getStorageRatio(building, view)
    };
  })
  .filter((facility): facility is FacilitySceneState => Boolean(facility));

const mapPlots = (
  view: GameViewModel,
  plots: readonly CityPlotConfig[],
  facilities: readonly FacilitySceneState[],
  selected?: BuildingConfig
): PlotSceneState[] => plots.map((plot): PlotSceneState => {
  const occupant = facilities.find((facility) => facility.plotId === plot.id);
  const check = selected
    ? CityMapSystem.canPlace(selected, plot, view.buildings)
    : undefined;
  return {
    ...toScenePoint(plot),
    id: plot.id,
    zone: plot.zone,
    label: plot.label ?? zoneLabels[plot.zone],
    scale: plot.scale ?? 1,
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

export class CitySceneMapper {
  static map(view: GameViewModel, selectedBuildingId?: string): CitySceneState {
    const plots = LevelLoader.getWorldPlots(view.level);
    const selected = selectedBuildingId
      ? view.availableBuildings.find((building) => building.id === selectedBuildingId)
      : undefined;
    const cityConfig = view.level.presentation?.world?.city ?? { x: 50, y: 50 };
    const city = toScenePoint(cityConfig);
    city.elevation = 1.4;

    const supplyRatio = clamp(view.state.supplyRatio, 0, 1);
    const theme = view.level.presentation?.world?.theme ?? 'residential';
    const facilities = mapFacilities(view, plots);
    const scenePlots = mapPlots(view, plots, facilities, selected);
    const districts = makeDistricts(plots, supplyRatio, theme);
    const roads = makeRoads(
      view.level.id,
      plots,
      city,
      view.state.population,
      supplyRatio
    );
    const ambientBlocks = makeAmbientBlocks(view.level.id, plots, districts, theme);
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
      blackoutIntensity: clamp((0.97 - supplyRatio) / 0.55, 0, 1),
      trafficDensity,
      city,
      camera: getCamera(view),
      districts,
      plots: scenePlots,
      facilities,
      links: mapLinks(facilities, city, supplyRatio),
      roads,
      ambientBlocks,
      placement
    };
    const backgroundAssetId = view.level.presentation?.backgroundAssetId;
    if (backgroundAssetId) scene.backgroundAssetId = backgroundAssetId;
    return scene;
  }
}
