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

  it('uses approved body cuts and optional component ids for commercial City-01', () => {
    const construction = FacilityVisualRegistry.resolve({
      configId: 'solar_basic',
      category: 'generation',
      enabled: true,
      selected: false,
      constructionProgress: 0.5,
      presentation: 'commercial'
    });
    const wind = FacilityVisualRegistry.resolve({
      configId: 'wind_basic',
      category: 'generation',
      enabled: true,
      selected: false,
      constructionProgress: 1,
      presentation: 'commercial'
    });
    const gas = FacilityVisualRegistry.resolve({
      configId: 'gas_basic',
      category: 'generation',
      enabled: true,
      selected: false,
      constructionProgress: 1,
      presentation: 'commercial'
    });
    const utilityStorage = FacilityVisualRegistry.resolve({
      configId: 'battery_utility',
      category: 'storage',
      enabled: true,
      selected: false,
      constructionProgress: 1,
      presentation: 'commercial'
    });

    expect(construction.bodyAssetId).toBe('commercial_facility_solar_construction');
    expect(construction.lightAssetId).toBeUndefined();
    expect(wind.motionAssetId).toBe('commercial_facility_wind_component_motion');
    expect(gas.effectAssetId).toBe('commercial_facility_gas_component_effect');
    expect(utilityStorage.bodyAssetId).toBe('commercial_facility_battery_utility_active');
    expect(utilityStorage.lightAssetId)
      .toBe('commercial_facility_battery_utility_component_light');
  });

  it('does not request optional component cuts while offline', () => {
    const wind = FacilityVisualRegistry.resolve({
      configId: 'wind_basic',
      category: 'generation',
      enabled: false,
      selected: false,
      constructionProgress: 1,
      presentation: 'commercial'
    });

    expect(wind.state).toBe('offline');
    expect(wind.motionAssetId).toBeUndefined();
    expect(wind.lightAssetId).toBeUndefined();
    expect(wind.effectAssetId).toBeUndefined();
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
