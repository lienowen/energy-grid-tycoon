import { describe, expect, it } from 'vitest';
import { city01UnifiedGridCatalog } from './City01UnifiedGridCatalog';

describe('City01UnifiedGridCatalog', () => {
  it('exposes seven modular line assets with one 512 by 128 contract', () => {
    expect(city01UnifiedGridCatalog.entries).toHaveLength(7);
    for (const entry of city01UnifiedGridCatalog.entries) {
      expect(entry.id.startsWith('city01_grid_line_')).toBe(true);
      expect(entry.width).toBe(512);
      expect(entry.height).toBe(128);
      expect(entry.anchor).toEqual({ x: 0.5, y: 0.5 });
      expect(entry.tags?.includes('grid-line-runtime-v1')).toBe(true);
    }
  });

  it('keeps towers separate from line runtime ids', () => {
    expect(city01UnifiedGridCatalog.entries.some((entry) =>
      entry.id.includes('tower') || entry.id.includes('node')
    )).toBe(false);
  });
});
