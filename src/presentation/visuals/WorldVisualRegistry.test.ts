import { describe, expect, it } from 'vitest';
import type { AmbientBlockSceneState } from '../CitySceneTypes';
import { WorldVisualRegistry } from './WorldVisualRegistry';

const block = (overrides: Partial<AmbientBlockSceneState> = {}): AmbientBlockSceneState => ({
  id: 'block-a',
  zone: 'neighborhood',
  kind: 'residential',
  x: 10,
  z: 12,
  elevation: 1,
  width: 8,
  depth: 7,
  height: 12,
  floors: 6,
  lightSeed: 42,
  powerRatio: 1,
  ...overrides
});

describe('WorldVisualRegistry', () => {
  it('selects deterministic building assets and presentation state', () => {
    const day = WorldVisualRegistry.resolveAmbientBlock(block(), 12);
    const night = WorldVisualRegistry.resolveAmbientBlock(block(), 22);
    const blackout = WorldVisualRegistry.resolveAmbientBlock(block({ powerRatio: 0.2 }), 12);

    expect(day.bodyAssetId).toMatch(/^world_building_res_/);
    expect(day.bodyAssetId).toContain('_day');
    expect(night.bodyAssetId).toContain('_night');
    expect(blackout.bodyAssetId).toContain('_blackout');
    expect(day.shadowAssetId).toMatch(/_shadow$/);
  });

  it('uses registered park decorations instead of building geometry', () => {
    const visual = WorldVisualRegistry.resolveAmbientBlock(block({ kind: 'park' }), 12);

    expect(visual.bodyAssetId).toBeUndefined();
    expect(visual.decorationAssetIds).toHaveLength(3);
    expect(visual.decorationAssetIds?.every((id) => id.startsWith('world_decoration_'))).toBe(true);
  });

  it('maps road lanes and traffic directions to stable asset ids', () => {
    expect(WorldVisualRegistry.resolveRoad({ laneCount: 1 }, 'ne')).toBe('world_road_straight_2_ne');
    expect(WorldVisualRegistry.resolveRoad({ laneCount: 2 }, 'nw')).toBe('world_road_straight_4_nw');
    expect(WorldVisualRegistry.resolveVehicle(4, 'se')).toMatch(/^world_vehicle_.+_se$/);
  });

  it('maps citizen and district pressure to world effects', () => {
    expect(WorldVisualRegistry.resolveCitizenEffect('positive')).toBe('world_effect_citizen_happy');
    expect(WorldVisualRegistry.resolveDistrictEffect(0.3, 0.5)).toBe('world_effect_blackout_zone');
    expect(WorldVisualRegistry.resolveDistrictEffect(0.9, 0.95)).toBe('world_effect_demand_high');
  });
});