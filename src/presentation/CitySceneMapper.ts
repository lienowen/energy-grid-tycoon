import type { BuildingBase, BuildingConfig } from '../buildings/BuildingBase';
import type { CityPlotConfig, CityPlotZone } from '../core/CityMapConfig';
import type { GameViewModel } from '../core/GameManager';
import { CityMapSystem } from '../systems/CityMapSystem';
import { LevelLoader } from '../systems/LevelLoader';

export interface HologramCameraConfig {
  startZoom: number;
  minZoom: number;
  maxZoom: number;
  startOffsetX: number;
  startOffsetY: number;
}

export interface ScenePoint {
  x: number;
  z: number;
  elevation: number;
}

export interface DistrictSceneState extends ScenePoint {
  id: CityPlotZone;
  label: string;
  radiusX: number;
  radiusZ: number;
  powerRatio: number;
}

export interface FacilitySceneState extends ScenePoint {
  instanceId: string;
  configId: string;
  plotId: string;
  name: string;
  assetId: string;
  category: BuildingConfig['category'];
  enabled: boolean;
  level: number;
  scale: number;
  output: number;
  storageRatio: number;
}

export interface PlotSceneState extends ScenePoint {
  id: string;
  zone: CityPlotZone;
  label: string;
  scale: number;
  locked: boolean;
  occupied: boolean;
  available: boolean;
  blocked: boolean;
  blockedReason?: string;
  facilityId?: string;
}

export interface EnergyLinkSceneState {
  id: string;
  from: ScenePoint;
  to: ScenePoint;
  active: boolean;
  intensity: number;
}

export interface CityScenePlacementState {
  buildingId: string;
  buildingName: string;
  assetId: string;
  validPlotIds: string[];
}

export interface CitySceneState {
  levelId: string;
  cityName: string;
  theme: 'residential' | 'industrial' | 'green';
  accent: string;
  backgroundAssetId?: string;
  day: number;
  hour: number;
  population: number;
  satisfaction: number;
  pollutionRatio: number;
  supplyRatio: number;
  city: ScenePoint;
  camera: HologramCameraConfig;
  districts: DistrictSceneState[];
  plots: PlotSceneState[];
  facilities: FacilitySceneState[];
  links: EnergyLinkSceneState[];
  placement?: CityScenePlacementState;
}

const zoneLabels: Record<CityPlotZone, string> = {
  neighborhood: '居民社区',
  industrial: '产业区',
  coastal: '海岸能源区',
  outskirts: '城市边缘',
  utility: '公共服务区'
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toWorldPoint = (point: Pick<CityPlotConfig, 'x' | 'y' | 'elevation'>): ScenePoint => ({
  x: (point.x - 50) * 1.02,
  z: (point.y - 50) * 0.78,
  elevation: point.elevation ?? 0
});

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

const makeDistricts = (
  plots: readonly CityPlotConfig[],
  supplyRatio: number
): DistrictSceneState[] => {
  const zones = [...new Set(plots.map((plot) => plot.zone))];
  return zones.map((zone, index) => {
    const members = plots.filter((plot) => plot.zone === zone);
    const xs = members.map((plot) => toWorldPoint(plot).x);
    const zs = members.map((plot) => toWorldPoint(plot).z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const litShare = zones.length <= 1 ? supplyRatio : clamp(supplyRatio * zones.length - index, 0, 1);
    return {
      id: zone,
      label: zoneLabels[zone],
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      elevation: -0.35,
      radiusX: Math.max(10, (maxX - minX) / 2 + 8),
      radiusZ: Math.max(7, (maxZ - minZ) / 2 + 5),
      powerRatio: litShare
    };
  });
};

export class CitySceneMapper {
  static map(view: GameViewModel, selectedBuildingId?: string): CitySceneState {
    const plots = LevelLoader.getWorldPlots(view.level);
    const selected = selectedBuildingId
      ? view.availableBuildings.find((building) => building.id === selectedBuildingId)
      : undefined;
    const cityConfig = view.level.presentation?.world?.city ?? { x: 50, y: 50 };
    const city = toWorldPoint(cityConfig);
    city.elevation = 1.4;

    const facilities = view.buildings
      .filter((building): building is BuildingBase & { placementId: string } => Boolean(building.placementId))
      .map((building): FacilitySceneState | undefined => {
        const plot = plots.find((candidate) => candidate.id === building.placementId);
        if (!plot) return undefined;
        const point = toWorldPoint(plot);
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

    const scenePlots = plots.map((plot): PlotSceneState => {
      const occupant = facilities.find((facility) => facility.plotId === plot.id);
      const check = selected
        ? CityMapSystem.canPlace(selected, plot, view.buildings)
        : undefined;
      return {
        ...toWorldPoint(plot),
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

    const links = facilities.map((facility): EnergyLinkSceneState => ({
      id: `${facility.instanceId}-city`,
      from: facility,
      to: city,
      active: facility.enabled,
      intensity: facility.enabled ? clamp(view.state.supplyRatio, 0.25, 1) : 0.08
    }));

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
      theme: view.level.presentation?.world?.theme ?? 'residential',
      accent: view.level.presentation?.accent ?? '#4ad7ff',
      day: view.state.day,
      hour: view.state.hour,
      population: view.state.population,
      satisfaction: view.state.satisfaction,
      pollutionRatio: clamp(view.state.pollution / 100, 0, 1),
      supplyRatio: clamp(view.state.supplyRatio, 0, 1),
      city,
      camera: getCamera(view),
      districts: makeDistricts(plots, clamp(view.state.supplyRatio, 0, 1)),
      plots: scenePlots,
      facilities,
      links,
      placement
    };
    const backgroundAssetId = view.level.presentation?.backgroundAssetId;
    if (backgroundAssetId) scene.backgroundAssetId = backgroundAssetId;
    return scene;
  }
}
