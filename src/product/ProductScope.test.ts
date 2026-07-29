import { describe, expect, it } from 'vitest';
import { PRODUCT_SCOPE, isReleaseCity, selectReleaseLevels } from './ProductScope';

describe('ProductScope', () => {
  it('keeps City-01 as the only release target', () => {
    expect(PRODUCT_SCOPE.releaseCityId).toBe('city-01');
    expect(PRODUCT_SCOPE.expansionFrozen).toBe(true);
    expect(isReleaseCity('city-01')).toBe(true);
    expect(isReleaseCity('city-02')).toBe(false);
  });

  it('filters campaign levels to the commercial slice', () => {
    const levels = [
      { id: 'city-01', name: 'City 01' },
      { id: 'city-02', name: 'City 02' },
      { id: 'city-03', name: 'City 03' }
    ];

    expect(selectReleaseLevels(levels)).toEqual([{ id: 'city-01', name: 'City 01' }]);
  });
});
