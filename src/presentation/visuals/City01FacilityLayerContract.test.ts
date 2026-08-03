import { describe, expect, it } from 'vitest';
import { FacilityVisualRegistry } from './FacilityVisualRegistry';
import {
  CITY01_FACILITY_LAYER_CANVAS,
  CITY01_FACILITY_LAYER_FALLBACK,
  resolveCity01FacilityLayerStack
} from './City01FacilityLayerContract';

const commercial = (configId: string, category: 'generation' | 'storage' = 'generation') =>
  FacilityVisualRegistry.resolve({
    configId,
    category,
    enabled: true,
    selected: false,
    constructionProgress: 1,
    presentation: 'commercial'
  });

describe('City01FacilityLayerContract', () => {
  it('keeps shared cuts on one 512 canvas and one baseline', () => {
    expect(CITY01_FACILITY_LAYER_CANVAS).toEqual({
      width: 512,
      height: 512,
      anchorX: 0.5,
      anchorY: 0.9115,
      baseline: 467
    });
  });

  it('uses one authoritative generated body for each V2 facility family', () => {
    const wind = resolveCity01FacilityLayerStack(commercial('wind_basic'));
    const gas = resolveCity01FacilityLayerStack(commercial('gas_basic'));
    const battery = resolveCity01FacilityLayerStack(commercial('battery_basic', 'storage'));

    expect(wind.map((layer) => layer.role)).toEqual(['body']);
    expect(gas.map((layer) => layer.role)).toEqual(['body']);
    expect(battery.map((layer) => layer.role)).toEqual(['body']);
    expect(wind[0]?.assetId).toBe('commercial_facility_wind_active');
    expect(gas[0]?.assetId).toBe('commercial_facility_gas_active');
    expect(battery[0]?.assetId).toBe('commercial_facility_battery_active');
  });

  it('makes only the body mandatory and leaves optional motion to procedural feedback', () => {
    const layers = resolveCity01FacilityLayerStack(commercial('solar_basic'));
    expect(layers[0]?.required).toBe(true);
    expect(layers.slice(1).every((layer) => !layer.required)).toBe(true);
    expect(CITY01_FACILITY_LAYER_FALLBACK.missingOptionalLayer).toBe('procedural');
    expect(CITY01_FACILITY_LAYER_FALLBACK.hardGroundPadAllowed).toBe(false);
    expect(CITY01_FACILITY_LAYER_FALLBACK.bakedDropShadowAllowed).toBe(false);
  });
});
