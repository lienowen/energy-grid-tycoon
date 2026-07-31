import type { TileWorldConfig } from './LevelSceneLayout';

/**
 * City-01 is one district inside a larger world, not a closed island.
 * North/east land continues into locked fog; west/south open into water.
 */
export const city01WorldGridConfig: TileWorldConfig = {
  columns: 36,
  rows: 30,
  cellSize: 4,
  originX: -16,
  originY: -10,
  defaultTerrain: 'grass',
  westWaterColumnsByRow: [
    7, 7, 7, 6, 6, 6, 5, 5, 5, 5,
    4, 4, 4, 4, 5, 5, 5, 4, 4, 4,
    5, 5, 6, 6, 6, 7, 7, 8, 8, 9
  ],
  southWaterRowsByColumn: [
    6, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3,
    3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3,
    3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6
  ],
  // Overlapping stepped regions form an irregular purchased territory instead
  // of one bright rectangular board. Locked terrain still continues beyond it.
  unlockedRegions: [
    { x: 13, y: 6, width: 12, height: 3 },
    { x: 10, y: 9, width: 18, height: 4 },
    { x: 8, y: 13, width: 22, height: 5 },
    { x: 9, y: 18, width: 21, height: 4 },
    { x: 11, y: 22, width: 16, height: 3 },
    { x: 7, y: 14, width: 3, height: 6 }
  ],
  roadAnchors: [
    { id: 'north-regional-highway', x: 19, y: 0, edge: 'north', laneWidth: 4 },
    { id: 'east-intercity-road', x: 35, y: 14, edge: 'east', laneWidth: 4 },
    { id: 'west-harbor-bridge', x: 0, y: 15, edge: 'west', laneWidth: 4 },
    { id: 'south-service-causeway', x: 20, y: 29, edge: 'south', laneWidth: 2 }
  ],
  roadPaths: [
    {
      id: 'regional-east-west',
      laneWidth: 4,
      points: [{ x: 0, y: 15 }, { x: 12, y: 15 }, { x: 19, y: 14 }, { x: 35, y: 14 }]
    },
    {
      id: 'regional-north-spine',
      laneWidth: 4,
      points: [{ x: 19, y: 0 }, { x: 19, y: 14 }, { x: 20, y: 20 }]
    },
    {
      id: 'southern-utility-road',
      laneWidth: 2,
      points: [{ x: 20, y: 20 }, { x: 20, y: 29 }]
    },
    {
      id: 'commercial-loop-west',
      laneWidth: 2,
      points: [{ x: 12, y: 15 }, { x: 12, y: 11 }, { x: 16, y: 9 }, { x: 19, y: 10 }]
    },
    {
      id: 'residential-branch',
      laneWidth: 2,
      points: [{ x: 19, y: 10 }, { x: 24, y: 8 }, { x: 27, y: 9 }]
    },
    {
      id: 'industrial-branch',
      laneWidth: 2,
      points: [{ x: 20, y: 17 }, { x: 25, y: 19 }, { x: 28, y: 19 }]
    },
    {
      id: 'western-energy-branch',
      laneWidth: 2,
      points: [{ x: 12, y: 15 }, { x: 10, y: 19 }, { x: 11, y: 22 }]
    },
    {
      id: 'eastern-energy-branch',
      laneWidth: 2,
      points: [{ x: 27, y: 14 }, { x: 29, y: 16 }, { x: 29, y: 19 }]
    }
  ]
};
