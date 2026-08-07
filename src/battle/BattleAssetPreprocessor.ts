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

const cleanPixels = (context: CanvasRenderingContext2D, width: number, height: number): void => {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const [br, bg, bb] = estimateBackground(data, width, height);

  for (let index = 0; index < data.length; index += 4) {
    const originalAlpha = data[index + 3] ?? 0;
    if (originalAlpha === 0) continue;
    const dr = (data[index] ?? 0) - br;
    const dg = (data[index + 1] ?? 0) - bg;
    const db = (data[index + 2] ?? 0) - bb;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const matte = Math.max(0, Math.min(1, (distance - 6.5) / 25));
    data[index + 3] = clampByte(originalAlpha * matte);
  }

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
