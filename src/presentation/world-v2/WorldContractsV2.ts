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

  const plotIds = new Set(map.plots.map((plot) => plot.id));
  for (const district of map.districts) {
    for (const plotId of district.plots) {
      if (!plotIds.has(plotId)) {
        throw new Error(`District ${district.id} references unknown plot ${plotId}`);
      }
    }
  }

  for (const plot of map.plots) {
    assertPositiveInteger(plot.footprint.columns, `Plot ${plot.id} footprint columns`);
    assertPositiveInteger(plot.footprint.rows, `Plot ${plot.id} footprint rows`);
    if (plot.roadEntrance.offset < 0 || plot.roadEntrance.offset > 1) {
      throw new Error(`Plot ${plot.id} road entrance offset must be between 0 and 1`);
    }
  }
};
