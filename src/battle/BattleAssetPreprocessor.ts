import { AssetManager, type AssetEntry } from '../resources/AssetManager';

type Anchor = 'center' | 'bottom';

interface TrimRule {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  anchor?: Anchor;
  scale?: number;
}

const DEFAULT_BACKGROUND = [28, 30, 33] as const;
const GRID_DEFENSE_PREFIX = 'griddef_';
const CONNECTED_BACKGROUND_DISTANCE = 52;
const EDGE_FEATHER_DISTANCE = 92;

const TRIM_RULES: Readonly<Record<string, TrimRule>> = {
  griddef_monsters_small_walk: { top: 0.13, anchor: 'bottom' },
  griddef_monsters_boss_walk: { top: 0.13, anchor: 'bottom' },
  griddef_monsters_boss_roar: { top: 0.13, anchor: 'bottom' },
  griddef_states_battery_charging: { top: 0.11, anchor: 'bottom' },
  griddef_states_battery_discharging: { top: 0.11, anchor: 'bottom' },
  griddef_effects_battery_discharge_effect: { bottom: 0.08 },

  griddef_ui_close_zone: { bottom: 0.20, scale: 1.08 },
  griddef_ui_switch_route: { bottom: 0.20, scale: 1.08 },
  griddef_ui_force_overload: { bottom: 0.20, scale: 1.08 },
  griddef_ui_pause: { bottom: 0.20, scale: 1.08 },
  griddef_ui_restart: { bottom: 0.20, scale: 1.08 },
  griddef_ui_next_wave: { bottom: 0.20, scale: 1.08 },
  griddef_ui_wave_start: { bottom: 0.18, scale: 1.08 },
  griddef_ui_boss_incoming: { bottom: 0.18, scale: 1.08 },
  griddef_ui_hospital_alarm: { bottom: 0.18, scale: 1.08 },
  griddef_ui_battery_energy_bar: { bottom: 0.15, scale: 1.04 },
  griddef_ui_countdown_timer: { bottom: 0.15, scale: 1.04 }
};

const bottomAnchored = (id: string): boolean =>
  id.includes('_buildings_')
  || id.includes('_states_')
  || id.includes('_rifts_')
  || id.includes('_monsters_');

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Battle asset failed to load: ${src}`));
  image.src = src;
});

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const sourceRect = (image: HTMLImageElement, rule: TrimRule): [number, number, number, number] => {
  const left = Math.round(image.naturalWidth * (rule.left ?? 0));
  const top = Math.round(image.naturalHeight * (rule.top ?? 0));
  const right = Math.round(image.naturalWidth * (1 - (rule.right ?? 0)));
  const bottom = Math.round(image.naturalHeight * (1 - (rule.bottom ?? 0)));
  return [left, top, Math.max(1, right - left), Math.max(1, bottom - top)];
};

const estimateBackground = (data: Uint8ClampedArray, width: number, height: number): [number, number, number] => {
  const samples: Array<[number, number, number]> = [];
  const sample = (x: number, y: number): void => {
    const index = (y * width + x) * 4;
    if (data[index + 3] === 0) return;
    samples.push([data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0]);
  };

  const insetX = Math.min(2, Math.max(0, width - 1));
  const insetY = Math.min(2, Math.max(0, height - 1));
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 12))) {
    sample(x, insetY);
    sample(x, Math.max(0, height - 1 - insetY));
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 12))) {
    sample(insetX, y);
    sample(Math.max(0, width - 1 - insetX), y);
  }

  if (samples.length === 0) return [...DEFAULT_BACKGROUND];
  const sortedChannel = (channel: 0 | 1 | 2): number => {
    const values = samples.map((value) => value[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length * 0.42)] ?? DEFAULT_BACKGROUND[channel];
  };
  return [sortedChannel(0), sortedChannel(1), sortedChannel(2)];
};

const colorDistanceAt = (
  data: Uint8ClampedArray,
  pixelIndex: number,
  background: readonly [number, number, number]
): number => {
  const offset = pixelIndex * 4;
  const dr = (data[offset] ?? 0) - background[0];
  const dg = (data[offset + 1] ?? 0) - background[1];
  const db = (data[offset + 2] ?? 0) - background[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const hasAlphaAt = (data: Uint8ClampedArray, pixelIndex: number): boolean => (data[pixelIndex * 4 + 3] ?? 0) > 0;

export const removeConnectedBackground = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): void => {
  if (width <= 0 || height <= 0 || data.length < width * height * 4) return;

  const background = estimateBackground(data, width, height);
  const pixelCount = width * height;
  const connected = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let readIndex = 0;
  let writeIndex = 0;

  const enqueue = (pixelIndex: number): void => {
    if (pixelIndex < 0 || pixelIndex >= pixelCount || connected[pixelIndex] === 1) return;
    if (!hasAlphaAt(data, pixelIndex)) {
      connected[pixelIndex] = 1;
      queue[writeIndex++] = pixelIndex;
      return;
    }
    if (colorDistanceAt(data, pixelIndex, background) > CONNECTED_BACKGROUND_DISTANCE) return;
    connected[pixelIndex] = 1;
    queue[writeIndex++] = pixelIndex;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (readIndex < writeIndex) {
    const pixelIndex = queue[readIndex++] ?? 0;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (connected[pixelIndex] === 1) data[pixelIndex * 4 + 3] = 0;
  }

  const touchesRemovedBackground = (pixelIndex: number): boolean => {
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (connected[ny * width + nx] === 1) return true;
      }
    }
    return false;
  };

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const alphaOffset = pixelIndex * 4 + 3;
    const originalAlpha = data[alphaOffset] ?? 0;
    if (originalAlpha === 0 || !touchesRemovedBackground(pixelIndex)) continue;
    const distance = colorDistanceAt(data, pixelIndex, background);
    if (distance >= EDGE_FEATHER_DISTANCE) continue;
    const feather = clamp01((distance - CONNECTED_BACKGROUND_DISTANCE * 0.55) /
      (EDGE_FEATHER_DISTANCE - CONNECTED_BACKGROUND_DISTANCE * 0.55));
    data[alphaOffset] = clampByte(originalAlpha * feather);
  }
};

const cleanPixels = (context: CanvasRenderingContext2D, width: number, height: number): void => {
  const imageData = context.getImageData(0, 0, width, height);
  removeConnectedBackground(imageData.data, width, height);
  context.putImageData(imageData, 0, 0);
};

const cleanEntry = async (entry: AssetEntry): Promise<void> => {
  if (entry.kind !== 'image' || !entry.src || entry.src.startsWith('data:')) return;
  const image = await loadImage(entry.src);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width <= 0 || height <= 0) return;

  const rule = TRIM_RULES[entry.id] ?? { anchor: bottomAnchored(entry.id) ? 'bottom' : 'center' };
  const [sx, sy, sw, sh] = sourceRect(image, rule);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;

  const margin = 2;
  const requestedScale = rule.scale ?? 1;
  const fitScale = Math.min((width - margin * 2) / sw, (height - margin * 2) / sh);
  const scale = Math.min(fitScale, requestedScale);
  const drawWidth = Math.max(1, Math.round(sw * scale));
  const drawHeight = Math.max(1, Math.round(sh * scale));
  const dx = Math.round((width - drawWidth) / 2);
  const anchor = rule.anchor ?? (bottomAnchored(entry.id) ? 'bottom' : 'center');
  const dy = anchor === 'bottom'
    ? Math.max(0, height - drawHeight - 1)
    : Math.round((height - drawHeight) / 2);

  context.clearRect(0, 0, width, height);
  context.drawImage(image, sx, sy, sw, sh, dx, dy, drawWidth, drawHeight);
  cleanPixels(context, width, height);

  const cleanedSource = canvas.toDataURL('image/png');
  AssetManager.register({ ...entry, src: cleanedSource });
};

export const prepareGridDefenseAssets = async (): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof Image === 'undefined') return;

  const entries = AssetManager.ids()
    .filter((id) => id.startsWith(GRID_DEFENSE_PREFIX))
    .map((id) => AssetManager.getEntry(id))
    .filter((entry): entry is AssetEntry => Boolean(entry));

  const results = await Promise.allSettled(entries.map(cleanEntry));
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`Battle asset cleanup skipped ${failed.length} assets; original files remain available.`);
  }
};
