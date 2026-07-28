import { CanvasSource, Texture } from 'pixi.js';

const facilityPrefixes = [
  'commercial_facility_solar_',
  'commercial_facility_wind_',
  'commercial_facility_gas_',
  'commercial_facility_battery_',
  'commercial_facility_substation_',
  'world_facility_grid_node_'
] as const;

const requests = new Map<string, Promise<Texture | undefined>>();

export const isCity01FacilityRuntimeAsset = (assetId: string): boolean =>
  facilityPrefixes.some((prefix) => assetId.startsWith(prefix));

export const city01FacilitySubjectScale = (assetId: string): number => {
  if (assetId.startsWith('world_facility_grid_node_')) return 0.68;
  if (assetId.startsWith('commercial_facility_substation_')) return 0.74;
  if (assetId.startsWith('commercial_facility_solar_')) return 0.78;
  if (assetId.startsWith('commercial_facility_wind_')) return 0.8;
  if (assetId.startsWith('commercial_facility_gas_')) return 0.78;
  if (assetId.startsWith('commercial_facility_battery_')) return 0.78;
  return 1;
};

const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load City-01 facility source: ${source}`));
    image.src = source;
  });

const textureFromCanvas = (canvas: HTMLCanvasElement): Texture => {
  const source = new CanvasSource({ resource: canvas });
  source.scaleMode = 'linear';
  return new Texture({ source });
};

const buildFacilityTexture = async (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return undefined;
  const image = await loadImage(source);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return undefined;

  const subjectScale = city01FacilitySubjectScale(assetId);
  const targetWidth = width * subjectScale;
  const targetHeight = height * subjectScale;
  const anchorY = 0.9115;
  const targetX = (width - targetWidth) * 0.5;
  const targetY = height * anchorY - targetHeight * anchorY;

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, targetX, targetY, targetWidth, targetHeight);
  return textureFromCanvas(canvas);
};

export const createCity01FacilityRuntimeTexture = (
  assetId: string,
  source: string
): Promise<Texture | undefined> => {
  if (!isCity01FacilityRuntimeAsset(assetId)) return Promise.resolve(undefined);
  const key = `${assetId}:${source}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = buildFacilityTexture(assetId, source);
  requests.set(key, request);
  return request;
};
