import { describe, expect, it } from 'vitest';
import {
  city01GridCutSpec,
  isCity01GridRuntimeAsset
} from './City01GridTextureFactory';

describe('City01GridTextureFactory', () => {
  it('routes only modular City-01 line ids through the grid cropper', () => {
    expect(isCity01GridRuntimeAsset('city01_grid_line_normal')).toBe(true);
    expect(isCity01GridRuntimeAsset('city01_grid_line_arc')).toBe(true);
    expect(isCity01GridRuntimeAsset('world_facility_grid_node_active')).toBe(false);
  });

  it('removes both tower ends from composite normal overload and offline sources', () => {
    expect(city01GridCutSpec('city01_grid_line_normal')).toEqual({
      crop: { x: 105, y: 30, width: 371, height: 66 },
      maxSubjectWidth: 480,
      maxSubjectHeight: 44
    });
    expect(city01GridCutSpec('city01_grid_line_overload')).toEqual({
      crop: { x: 105, y: 28, width: 387, height: 70 },
      maxSubjectWidth: 480,
      maxSubjectHeight: 48
    });
    expect(city01GridCutSpec('city01_grid_line_offline')).toEqual({
      crop: { x: 105, y: 30, width: 385, height: 70 },
      maxSubjectWidth: 480,
      maxSubjectHeight: 44
    });
  });

  it('normalizes all line-only effects to one 512 by 128 canvas', () => {
    expect(city01GridCutSpec('city01_grid_line_flow'))
      .toEqual({ maxSubjectWidth: 480, maxSubjectHeight: 72 });
    expect(city01GridCutSpec('city01_grid_line_arc'))
      .toEqual({ maxSubjectWidth: 470, maxSubjectHeight: 104 });
  });
});
