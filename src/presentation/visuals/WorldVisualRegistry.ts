import type {
  AmbientBlockKind,
  AmbientBlockSceneState,
  CitizenFeedbackTone,
  RoadSceneState
} from '../CitySceneTypes';

export type BuildingVisualState = 'day' | 'night' | 'blackout';
export type RoadVisualDirection = 'ne' | 'nw';
export type VehicleVisualDirection = 'ne' | 'nw' | 'se' | 'sw';

export interface AmbientBlockVisualDescriptor {
  bodyAssetId?: string;
  shadowAssetId?: string;
  decorationAssetIds?: string[];
  state: BuildingVisualState;
}

const residentialBuildings = [
  'res_tower_a',
  'res_tower_b',
  'res_slab_a',
  'res_slab_b',
  'res_townhouse',
  'res_oldblock'
] as const;

const industrialBuildings = [
  'ind_factory',
  'ind_warehouse',
  'ind_tankfarm',
  'ind_heavy'
] as const;

const civicBuildings = [
  'civic_hospital',
  'civic_school',
  'civic_cityhall',
  'civic_transit'
] as const;

const commercialBuildings = [
  'com_mall',
  'com_office',
  'com_landmark',
  'com_strip'
] as const;

const parkDecorations = [
  'tree_oak',
  'tree_pine',
  'tree_round',
  'tree_maple',
  'tree_planter',
  'bench',
  'fountain'
] as const;

const vehicles = [
  'car_cyan',
  'car_green',
  'car_red',
  'taxi',
  'bus',
  'truck',
  'fire',
  'ambulance',
  'police',
  'service'
] as const;

const pick = <T>(items: readonly T[], seed: number): T => {
  const item = items[Math.abs(seed) % items.length];
  if (item === undefined) throw new Error('Visual registry pool cannot be empty');
  return item;
};

const resolveBuildingState = (hour: number, powerRatio: number): BuildingVisualState => {
  if (powerRatio < 0.48) return 'blackout';
  return hour < 6 || hour >= 19 ? 'night' : 'day';
};

const resolveBuildingPool = (
  kind: AmbientBlockKind,
  zone: AmbientBlockSceneState['zone']
): readonly string[] => {
  if (kind === 'industrial') return industrialBuildings;
  if (kind === 'utility') return civicBuildings;
  if (kind === 'residential') {
    if (zone === 'industrial') return commercialBuildings;
    if (zone === 'utility') return civicBuildings;
    return zone === 'coastal' ? commercialBuildings : residentialBuildings;
  }
  return [];
};

export class WorldVisualRegistry {
  static resolveAmbientBlock(
    block: AmbientBlockSceneState,
    hour: number
  ): AmbientBlockVisualDescriptor {
    const state = resolveBuildingState(hour, block.powerRatio);
    if (block.kind === 'park') {
      return {
        state,
        decorationAssetIds: [
          `world_decoration_${pick(parkDecorations, block.lightSeed)}`,
          `world_decoration_${pick(parkDecorations, block.lightSeed + 17)}`,
          `world_decoration_${pick(parkDecorations, block.lightSeed + 31)}`
        ]
      };
    }

    const pool = resolveBuildingPool(block.kind, block.zone);
    const building = pick(pool, block.lightSeed);
    return {
      state,
      bodyAssetId: `world_building_${building}_${state}`,
      shadowAssetId: `world_building_${building}_shadow`
    };
  }

  static resolveRoad(
    road: Pick<RoadSceneState, 'laneCount'>,
    direction: RoadVisualDirection
  ): string {
    const lanes = road.laneCount === 2 ? 4 : 2;
    return `world_road_straight_${lanes}_${direction}`;
  }

  static resolveRoadDirection(from: { x: number; y: number }, to: { x: number; y: number }): RoadVisualDirection {
    return (to.x - from.x) * (to.y - from.y) >= 0 ? 'ne' : 'nw';
  }

  static resolveVehicle(seed: number, direction: VehicleVisualDirection): string {
    return `world_vehicle_${pick(vehicles, seed)}_${direction}`;
  }

  static resolveVehicleDirection(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): VehicleVisualDirection {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx >= 0 && dy <= 0) return 'ne';
    if (dx < 0 && dy <= 0) return 'nw';
    if (dx >= 0) return 'se';
    return 'sw';
  }

  static resolveCitizenEffect(tone: CitizenFeedbackTone): string {
    if (tone === 'positive') return 'world_effect_citizen_happy';
    if (tone === 'danger') return 'world_effect_power_shortage';
    if (tone === 'warning') return 'world_effect_citizen_unhappy';
    return 'world_effect_demand_high';
  }

  static resolveDistrictEffect(powerRatio: number, demandIntensity = 0): string | undefined {
    if (powerRatio < 0.56) return 'world_effect_blackout_zone';
    if (demandIntensity > 0.78 && demandIntensity > powerRatio) return 'world_effect_demand_high';
    return undefined;
  }
}