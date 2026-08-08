import { describe, expect, it } from 'vitest';
import { BattleEngine } from './BattleEngine';
import { CITY01_SIEGE_LEVEL } from './levels/city01Siege';

interface RunMetrics {
  peakHospitalOutageSeconds: number;
  minBatteryEnergyMwh: number;
}

const advanceWithMetrics = (engine: BattleEngine, seconds: number, metrics: RunMetrics): void => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.1) {
    engine.tick(0.1);
    const snapshot = engine.snapshot();
    metrics.peakHospitalOutageSeconds = Math.max(
      metrics.peakHospitalOutageSeconds,
      snapshot.criticalOutageSeconds
    );
    metrics.minBatteryEnergyMwh = Math.min(metrics.minBatteryEnergyMwh, snapshot.batteryEnergyMwh);
  }
};

const initialMetrics = (): RunMetrics => ({
  peakHospitalOutageSeconds: 0,
  minBatteryEnergyMwh: Number.POSITIVE_INFINITY
});

describe('City-01 commercial first-minute playtest', () => {
  it('keeps the official tutorial route safe enough to enter wave two with recovery margin', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    const metrics = initialMetrics();
    engine.start();

    expect(engine.switchRoute('battery-industrial').ok).toBe(true);
    advanceWithMetrics(engine, 3.1, metrics);
    expect(engine.forceOverload('spawn-east-edge').ok).toBe(true);
    advanceWithMetrics(engine, 3.3, metrics);
    expect(engine.switchRoute('battery-industrial').ok).toBe(true);
    advanceWithMetrics(engine, 22, metrics);

    const snapshot = engine.snapshot();
    expect(snapshot.status).toBe('running');
    expect(snapshot.currentWaveIndex).toBeGreaterThanOrEqual(1);
    expect(metrics.peakHospitalOutageSeconds).toBeLessThan(12);
    expect(snapshot.batteryEnergyMwh).toBeGreaterThanOrEqual(38);
  });

  it('still punishes a player who never uses the grid as a weapon', () => {
    const engine = new BattleEngine(CITY01_SIEGE_LEVEL);
    engine.start();

    for (let elapsed = 0; elapsed < 190 && engine.snapshot().status === 'running'; elapsed += 0.1) {
      engine.tick(0.1);
    }

    expect(engine.snapshot().status).toBe('defeat');
  });
});
