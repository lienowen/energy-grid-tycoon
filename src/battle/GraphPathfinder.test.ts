import { describe, expect, it } from 'vitest';
import { findShortestPath } from './GraphPathfinder';
import { CITY01_SIEGE_LEVEL } from './levels/city01Siege';
import type { EdgeRuntimeState } from './types';

const runtime = (): Map<string, EdgeRuntimeState> => new Map(
  CITY01_SIEGE_LEVEL.edges.map((edge) => [edge.id, {
    id: edge.id,
    operatingState: 'online',
    loadMw: 0,
    loadPercent: 0,
    loadState: 'normal',
    overloadRemainingSeconds: 0
  }])
);

describe('findShortestPath', () => {
  it('uses the shortest powered route to the hospital', () => {
    const path = findShortestPath(
      CITY01_SIEGE_LEVEL.nodes,
      CITY01_SIEGE_LEVEL.edges,
      runtime(),
      'spawn-east',
      'hospital'
    );

    expect(path).toEqual([
      'spawn-east',
      'east-junction',
      'industrial',
      'battery',
      'substation',
      'west-junction',
      'hospital'
    ]);
  });

  it('reroutes after a switchable line is disconnected', () => {
    const edgeRuntime = runtime();
    const closed = edgeRuntime.get('battery-industrial');
    if (!closed) throw new Error('Missing battery-industrial edge');
    closed.operatingState = 'offline';

    const path = findShortestPath(
      CITY01_SIEGE_LEVEL.nodes,
      CITY01_SIEGE_LEVEL.edges,
      edgeRuntime,
      'spawn-east',
      'hospital'
    );

    expect(path).toContain('center-junction');
    expect(path).not.toContain('battery');
  });
});
