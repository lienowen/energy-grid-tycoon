import type { TileWorldConfig } from './LevelSceneLayout';

/**
 * City-01 is one district inside a larger world, not a closed island.
 * The 48x42 grid deliberately overscans the home camera: west/south continue
 * into open water while north/east continue into locked land and fog.
 */
export const city01WorldGridConfig: TileWorldConfig = {
  columns: 48,
  rows: 42,
  cellSize: 4,
  originX: -40,
  originY: -34,
  defaultTerrain: 'grass',
  westWaterColumnsByRow: [
    13, 13, 13, 13, 13, 13,
    13, 13, 13, 12, 12, 12, 11, 11, 11, 11,
    10, 10, 10, 10, 11, 11, 11, 10, 10, 10,
    11, 11, 12, 12, 12, 13, 13, 14, 14, 15,
    15, 15, 15, 16, 16, 16
  ],
  southWaterRowsByColumn: [
    12, 12, 12, 12, 12, 12,
    12, 12, 12, 11, 11, 11, 10, 10, 10, 9, 9, 9,
    9, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9,
    9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12,
    12, 12, 12, 12, 12, 12
  ],
  // Overlapping stepped regions form an irregular purchased territory instead
  // of one bright rectangular board. Locked terrain still continues beyond it.
  unlockedRegions: [
    { x: 19, y: 12, width: 12, height: 3 },
    { x: 16, y: 15, width: 18, height: 4 },
    { x: 14, y: 19, width: 22, height: 5 },
    { x: 15, y: 24, width: 21, height: 4 },
    { x: 17, y: 28, width: 16, height: 3 },
    { x: 13, y: 20, width: 3, height: 6 }
  ],
  roadAnchors: [
    { id: 'north-regional-highway', x: 25, y: 0, edge: 'north', laneWidth: 4 },
    { id: 'east-intercity-road', x: 47, y: 20, edge: 'east', laneWidth: 4 },
    { id: 'west-harbor-bridge', x: 0, y: 21, edge: 'west', laneWidth: 4 },
    { id: 'south-service-causeway', x: 26, y: 41, edge: 'south', laneWidth: 2 }
  ],
  roadPaths: [
    {
      id: 'regional-east-west',
      laneWidth: 4,
      points: [{ x: 0, y: 21 }, { x: 18, y: 21 }, { x: 25, y: 20 }, { x: 47, y: 20 }]
    },
    {
      id: 'regional-north-spine',
      laneWidth: 4,
      points: [{ x: 25, y: 0 }, { x: 25, y: 20 }, { x: 26, y: 26 }]
    },
    {
      id: 'southern-utility-road',
      laneWidth: 2,
      points: [{ x: 26, y: 26 }, { x: 26, y: 41 }]
    },
    {
      id: 'commercial-loop-west',
      laneWidth: 2,
      points: [{ x: 18, y: 21 }, { x: 18, y: 17 }, { x: 22, y: 15 }, { x: 25, y: 16 }]
    },
    {
      id: 'residential-branch',
      laneWidth: 2,
      points: [{ x: 25, y: 16 }, { x: 30, y: 14 }, { x: 33, y: 15 }]
    },
    {
      id: 'industrial-branch',
      laneWidth: 2,
      points: [{ x: 26, y: 23 }, { x: 31, y: 25 }, { x: 34, y: 25 }]
    },
    {
      id: 'western-energy-branch',
      laneWidth: 2,
      points: [{ x: 18, y: 21 }, { x: 16, y: 25 }, { x: 17, y: 28 }]
    },
    {
      id: 'eastern-energy-branch',
      laneWidth: 2,
      points: [{ x: 33, y: 20 }, { x: 35, y: 22 }, { x: 35, y: 25 }]
    }
  ]
};
