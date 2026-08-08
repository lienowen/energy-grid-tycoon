import { describe, expect, it } from 'vitest';
import { removeConnectedBackground } from './BattleAssetPreprocessor';

const createImage = (width: number, height: number, rgba: [number, number, number, number]): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    data[offset] = rgba[0];
    data[offset + 1] = rgba[1];
    data[offset + 2] = rgba[2];
    data[offset + 3] = rgba[3];
  }
  return data;
};

const setPixel = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rgba: [number, number, number, number]
): void => {
  const offset = (y * width + x) * 4;
  data[offset] = rgba[0];
  data[offset + 1] = rgba[1];
  data[offset + 2] = rgba[2];
  data[offset + 3] = rgba[3];
};

const alphaAt = (data: Uint8ClampedArray, width: number, x: number, y: number): number =>
  data[(y * width + x) * 4 + 3] ?? 0;

describe('battle asset cleanup', () => {
  it('removes only border-connected dark background and preserves enclosed dark sprite detail', () => {
    const width = 9;
    const height = 9;
    const data = createImage(width, height, [28, 30, 33, 255]);

    for (let y = 2; y <= 6; y += 1) {
      for (let x = 2; x <= 6; x += 1) {
        const isOutline = x === 2 || x === 6 || y === 2 || y === 6;
        setPixel(data, width, x, y, isOutline ? [120, 132, 138, 255] : [31, 33, 36, 255]);
      }
    }

    removeConnectedBackground(data, width, height);

    expect(alphaAt(data, width, 0, 0)).toBe(0);
    expect(alphaAt(data, width, 8, 8)).toBe(0);
    expect(alphaAt(data, width, 4, 4)).toBe(255);
    expect(alphaAt(data, width, 2, 4)).toBeGreaterThan(220);
  });

  it('absorbs mild grid/background variation connected to the crop edge', () => {
    const width = 7;
    const height = 7;
    const data = createImage(width, height, [28, 30, 33, 255]);
    for (let y = 0; y < height; y += 1) setPixel(data, width, 1, y, [42, 44, 47, 255]);
    setPixel(data, width, 3, 3, [170, 190, 205, 255]);

    removeConnectedBackground(data, width, height);

    expect(alphaAt(data, width, 1, 3)).toBe(0);
    expect(alphaAt(data, width, 3, 3)).toBeGreaterThan(220);
  });
});
