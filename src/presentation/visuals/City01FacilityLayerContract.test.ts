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

  it('maps wind, gas and storage to technology-specific optional layers', () => {
    const wind = resolveCity01FacilityLayerStack(commercial('wind_basic'));
    const gas = resolveCity01FacilityLayerStack(commercial('gas_basic'));
    const battery = resolveCity01FacilityLayerStack(commercial('battery_basic', 'storage'));

    expect(wind.map((layer) => layer.role)).toEqual(['body', 'motion']);
    expect(wind[1]).toMatchObject({
      animation: 'rotate',
      layout: 'shared-canvas',
      pivotX: 0.476,
      pivotY: 0.342
    });
    expect(gas.map((layer) => layer.role)).toEqual(['body', 'effect']);
    expect(gas[1]).toMatchObject({
      animation: 'rise',
      layout: 'trimmed-effect',
      widthFactor: 0.58,
      offsetXFactor: -0.16
    });
    expect(battery.map((layer) => layer.role)).toEqual(['body', 'light']);
    expect(battery[1]).toMatchObject({ animation: 'pulse', layout: 'shared-canvas' });
  });

  it('makes only the body mandatory and forbids baked pads and shadows', () => {
    const layers = resolveCity01FacilityLayerStack(commercial('solar_basic'));
    expect(layers[0]?.required).toBe(true);
    expect(layers.slice(1).every((layer) => !layer.required)).toBe(true);
    expect(CITY01_FACILITY_LAYER_FALLBACK.missingOptionalLayer).toBe('procedural');
    expect(CITY01_FACILITY_LAYER_FALLBACK.hardGroundPadAllowed).toBe(false);
    expect(CITY01_FACILITY_LAYER_FALLBACK.bakedDropShadowAllowed).toBe(false);
  });
});
