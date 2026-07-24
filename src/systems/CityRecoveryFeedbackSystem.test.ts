import { describe, expect, it } from 'vitest';
import type { CityRecoverySnapshot } from './CityRecoveryFeedbackSystem';
import { CityRecoveryFeedbackSystem } from './CityRecoveryFeedbackSystem';

const snapshot = (overrides: Partial<CityRecoverySnapshot> = {}): CityRecoverySnapshot => ({
  levelId: 'city-01',
  completed: false,
  beatId: 'stabilize',
  districts: [
    { id: 'central', label: '城市居住区', status: 'warning' },
    { id: 'old-town', label: '东部老城区', status: 'blackout' }
  ],
  ...overrides
});

describe('CityRecoveryFeedbackSystem', () => {
  it('does not replay feedback when a level is first mounted', () => {
    expect(CityRecoveryFeedbackSystem.detect(undefined, snapshot())).toEqual([]);
  });

  it('announces districts that visibly recover', () => {
    const events = CityRecoveryFeedbackSystem.detect(
      snapshot(),
      snapshot({
        districts: [
          { id: 'central', label: '城市居住区', status: 'normal' },
          { id: 'old-town', label: '东部老城区', status: 'normal' }
        ]
      })
    );

    expect(events.some((event) => event.title.includes('2 个城区恢复供电'))).toBe(true);
    expect(events.some((event) => event.message.includes('东部老城区'))).toBe(true);
  });

  it('raises an urgent warning when a powered district falls into blackout', () => {
    const events = CityRecoveryFeedbackSystem.detect(
      snapshot({ districts: [{ id: 'central', label: '城市居住区', status: 'normal' }] }),
      snapshot({ districts: [{ id: 'central', label: '城市居住区', status: 'blackout' }] })
    );

    expect(events[0]).toMatchObject({ tone: 'danger' });
    expect(events[0]?.title).toContain('进入停电状态');
  });

  it('turns experience progression into a visible milestone', () => {
    const events = CityRecoveryFeedbackSystem.detect(
      snapshot({ beatId: 'store' }),
      snapshot({ beatId: 'develop' })
    );

    expect(events.some((event) => event.title === '城市储能上线')).toBe(true);
  });

  it('gives scenario completion the highest visual priority', () => {
    const events = CityRecoveryFeedbackSystem.detect(
      snapshot({ beatId: 'prosper' }),
      snapshot({ beatId: undefined, completed: true })
    );

    expect(events[0]).toMatchObject({ id: 'scenario-complete', tone: 'celebration' });
  });

  it('does not compare snapshots across different cities', () => {
    expect(CityRecoveryFeedbackSystem.detect(
      snapshot(),
      snapshot({ levelId: 'city-02' })
    )).toEqual([]);
  });
});
