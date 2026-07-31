import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CitySceneMapper } from '../CitySceneMapper';

const rendererSource = readFileSync(
  new URL('./City01IntegratedPixiWorld.ts', import.meta.url),
  'utf8'
);
const mapperSource = readFileSync(
  new URL('../CitySceneMapper.ts', import.meta.url),
  'utf8'
);

describe('City-01 tile-world architecture', () => {
  it('uses mapped tile-world state for normal runtime rendering', () => {
    expect(rendererSource).toContain('City01TilemapRenderer.render');
    expect(rendererSource).toContain("state.tileWorld ? 'tile-world' : 'legacy-fallback'");
    expect(rendererSource).not.toContain('drawIslandBase');
    expect(rendererSource).not.toContain('buildCity01AccessRoads');
  });

  it('keeps the legacy authored background behind showcase mode only', () => {
    expect(rendererSource).toContain("if (mode === 'showcase')");
    expect(rendererSource).toContain("this.drawMapComposition(generation, 'showcase')");
  });

  it('constructs the tile matrix in the mapper rather than the renderer', () => {
    expect(mapperSource).toContain('TileWorldBuilder.build(layout.worldGrid)');
    expect(rendererSource).not.toContain('LevelSceneLayoutRegistry');
    expect(CitySceneMapper).toBeDefined();
  });
});
