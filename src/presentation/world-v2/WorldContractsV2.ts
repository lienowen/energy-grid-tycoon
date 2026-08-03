export type WorldV2ZoneKind =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'public'
  | 'old_town'
  | 'utility'
  | 'coastal'
  | 'outskirts';

export type WorldV2TerrainKind =
  | 'grass'
  | 'water'
  | 'coast'
  | 'forest'
  | 'park'
  | 'industrial_ground';

export type WorldV2RoadKind =
  | 'arterial'
  | 'collector'
  | 'local'
  | 'service'
  | 'bridge';

export type WorldV2FacilityState =
  | 'construction'
  | 'active'
  | 'offline'
  | 'fault';

export interface WorldV2Point {
  /** East-west coordinate in logical world cells. */
  x: number;
  /** North-south coordinate in logical world cells. */
  z: number;
  /** Vertical offset in logical world units. */
  elevation?: number;
}

export interface WorldV2Size {
  columns: number;
  rows: number;
}

export interface WorldV2Footprint extends WorldV2Size {
  origin: WorldV2Point;
  rotation: 0 | 90 | 180 | 270;
}

export interface WorldV2RoadEntrance {
  edge: 'north' | 'east' | 'south' | 'west';
  offset: number;
  roadId?: string;
}

export interface WorldV2PlotContract {
  id: string;
  zone: WorldV2ZoneKind;
  footprint: WorldV2Footprint;
  roadEntrance: WorldV2RoadEntrance;
  allowedFacilityIds: string[];
  initiallyOccupied?: boolean;
}

export interface WorldV2RoadContract {
  id: string;
  kind: WorldV2RoadKind;
  laneWidth: 2 | 4 | 6;
  points: WorldV2Point[];
}

export interface WorldV2DistrictContract {
  id: string;
  zone: Exclude<WorldV2ZoneKind, 'utility' | 'coastal' | 'outskirts'>;
  plots: string[];
  stableSeed: number;
}

export interface WorldV2FacilityVisualContract {
  facilityId: string;
  footprint: WorldV2Size;
  anchor: { x: number; y: number };
  roadEntrance: WorldV2RoadEntrance;
  gridConnection: WorldV2Point;
  assets: Record<WorldV2FacilityState, string>;
}

export interface WorldV2MapContract {
  schemaVersion: 2;
  id: string;
  columns: number;
  rows: number;
  cellSize: number;
  terrain: Array<{
    id: string;
    kind: WorldV2TerrainKind;
    footprint: WorldV2Footprint;
  }>;
  roads: WorldV2RoadContract[];
  plots: WorldV2PlotContract[];
  districts: WorldV2DistrictContract[];
}

const assertPositiveInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
};

const assertPointInsideMap = (
  point: WorldV2Point,
  map: Pick<WorldV2MapContract, 'columns' | 'rows'>,
  label: string
): void => {
  if (point.x < 0 || point.x > map.columns || point.z < 0 || point.z > map.rows) {
    throw new Error(`${label} is outside the World V2 map`);
  }
};

const assertFootprintInsideMap = (
  footprint: WorldV2Footprint,
  map: Pick<WorldV2MapContract, 'columns' | 'rows'>,
  label: string
): void => {
  assertPositiveInteger(footprint.columns, `${label} columns`);
  assertPositiveInteger(footprint.rows, `${label} rows`);
  assertPointInsideMap(footprint.origin, map, `${label} origin`);
  if (
    footprint.origin.x + footprint.columns > map.columns
    || footprint.origin.z + footprint.rows > map.rows
  ) {
    throw new Error(`${label} exceeds the World V2 map bounds`);
  }
};

/**
 * Fails fast when authored World V2 data would create ambiguous placement or
 * rendering behavior. More geometric checks will be added with the map editor.
 */
export const assertWorldV2MapContract = (map: WorldV2MapContract): void => {
  if (map.schemaVersion !== 2) throw new Error('World V2 map schemaVersion must be 2');
  if (!map.id.trim()) throw new Error('World V2 map id is required');
  assertPositiveInteger(map.columns, 'World V2 map columns');
  assertPositiveInteger(map.rows, 'World V2 map rows');
  if (!(map.cellSize > 0)) throw new Error('World V2 map cellSize must be positive');

  const unique = (items: readonly { id: string }[], label: string): void => {
    const ids = new Set<string>();
    for (const item of items) {
      if (!item.id.trim()) throw new Error(`${label} id is required`);
      if (ids.has(item.id)) throw new Error(`Duplicate ${label} id: ${item.id}`);
      ids.add(item.id);
    }
  };

  unique(map.terrain, 'terrain');
  unique(map.roads, 'road');
  unique(map.plots, 'plot');
  unique(map.districts, 'district');

  for (const terrain of map.terrain) {
    assertFootprintInsideMap(terrain.footprint, map, `Terrain ${terrain.id} footprint`);
  }

  const roadIds = new Set(map.roads.map((road) => road.id));
  for (const road of map.roads) {
    if (road.points.length < 2) throw new Error(`Road ${road.id} requires at least two points`);
    for (const [index, point] of road.points.entries()) {
      assertPointInsideMap(point, map, `Road ${road.id} point ${index}`);
    }
  }

  const plotIds = new Set(map.plots.map((plot) => plot.id));
  const assignedPlotIds = new Set<string>();
  for (const district of map.districts) {
    if (!Number.isInteger(district.stableSeed)) {
      throw new Error(`District ${district.id} stableSeed must be an integer`);
    }
    for (const plotId of district.plots) {
      if (!plotIds.has(plotId)) {
        throw new Error(`District ${district.id} references unknown plot ${plotId}`);
      }
      if (assignedPlotIds.has(plotId)) {
        throw new Error(`Plot ${plotId} is assigned to multiple districts`);
      }
      assignedPlotIds.add(plotId);
    }
  }

  for (const plot of map.plots) {
    assertFootprintInsideMap(plot.footprint, map, `Plot ${plot.id} footprint`);
    if (plot.allowedFacilityIds.length === 0) {
      throw new Error(`Plot ${plot.id} must allow at least one facility`);
    }
    if (plot.roadEntrance.offset < 0 || plot.roadEntrance.offset > 1) {
      throw new Error(`Plot ${plot.id} road entrance offset must be between 0 and 1`);
    }
    if (plot.roadEntrance.roadId && !roadIds.has(plot.roadEntrance.roadId)) {
      throw new Error(
        `Plot ${plot.id} references unknown road ${plot.roadEntrance.roadId}`
      );
    }
  }
};
