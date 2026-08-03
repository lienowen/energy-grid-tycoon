import { describe, expect, it } from 'vitest';
import city01MapData from '../../data/city01-world-v2/map.json';
import {
  assertWorldV2MapContract,
  type WorldV2MapContract
} from './WorldContractsV2';
import { WorldProjectionV2 } from './WorldProjectionV2';

describe('WorldProjectionV2', () => {
  it('round-trips a point on the same elevation plane', () => {
    const projection = new WorldProjectionV2();
    const world = { x: 17.25, z: 9.5, elevation: 0.4 };
    const screen = projection.project(world);
    const restored = projection.unproject(screen, world.elevation);

    expect(restored.x).toBeCloseTo(world.x, 6);
    expect(restored.z).toBeCloseTo(world.z, 6);
    expect(restored.elevation).toBe(world.elevation);
  });

  it('sorts farther south-east points above nearer points', () => {
    const projection = new WorldProjectionV2();
    expect(projection.depth({ x: 20, z: 20 })).toBeGreaterThan(
      projection.depth({ x: 10, z: 10 })
    );
  });
});

describe('City-01 World V2 map', () => {
  it('passes the authored map contract', () => {
    const map = city01MapData as WorldV2MapContract;
    expect(() => assertWorldV2MapContract(map)).not.toThrow();
  });

  it('rejects plots that reference a missing road', () => {
    const source = city01MapData as WorldV2MapContract;
    const firstPlot = source.plots[0];
    expect(firstPlot).toBeDefined();
    if (!firstPlot) return;

    const invalid: WorldV2MapContract = {
      ...source,
      plots: [
        {
          ...firstPlot,
          roadEntrance: {
            ...firstPlot.roadEntrance,
            roadId: 'missing-road'
          }
        },
        ...source.plots.slice(1)
      ]
    };

    expect(() => assertWorldV2MapContract(invalid)).toThrow(/missing-road/);
  });
});
