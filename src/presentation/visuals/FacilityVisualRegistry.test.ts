import { describe, expect, it } from 'vitest';
import { FacilityVisualRegistry } from './FacilityVisualRegistry';

describe('FacilityVisualRegistry', () => {
  it('maps configured facilities to stable v5 asset ids', () => {
    const visual = FacilityVisualRegistry.resolve({
      configId: 'wind_offshore',
      category: 'generation',
      enabled: true,
      selected: false,
      constructionProgress: 1
    });

    expect(visual.family).toBe('offshore_wind');
    expect(visual.bodyAssetId).toBe('world_facility_offshore_wind_active');
    expect(visual.shadowAssetId).toBe('world_facility_offshore_wind_shadow');
  });

  it('uses presentation state precedence without level-specific branches', () => {
    const construction = FacilityVisualRegistry.resolve({
      configId: 'solar_basic',
      category: 'generation',
      enabled: true,
      selected: true,
      constructionProgress: 0.6
    });
    const offline = FacilityVisualRegistry.resolve({
      configId: 'gas_basic',
      category: 'generation',
      enabled: false,
      selected: false,
      constructionProgress: 1
    });

    expect(construction.state).toBe('construction');
    expect(construction.bodyAssetId).toBe('world_facility_solar_construction');
    expect(offline.state).toBe('offline');
    expect(offline.lightAssetId).toBeUndefined();
  });

  it('falls back by category for future registered content', () => {
    const storage = FacilityVisualRegistry.resolve({
      configId: 'future_storage',
      category: 'storage',
      enabled: true,
      selected: false,
      constructionProgress: 1
    });

    expect(storage.family).toBe('battery');
    expect(storage.bodyAssetId).toBe('world_facility_battery_active');
  });
});
