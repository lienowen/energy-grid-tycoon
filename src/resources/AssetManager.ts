export type AssetKind = 'image' | 'audio' | 'font' | 'spritesheet';
export type AssetPreloadGroup = 'boot' | 'level' | 'lazy';
export type AssetLoadStatus = 'idle' | 'loaded' | 'failed';

export interface AssetEntry {
  id: string;
  kind: AssetKind;
  src: string;
  version: number;
  preload: AssetPreloadGroup;
  width?: number;
  height?: number;
  anchor?: { x: number; y: number };
  tags?: string[];
}

export interface AssetCatalog {
  schemaVersion: number;
  budgetBytes?: number;
  entries: AssetEntry[];
}

export interface AssetPreloadReport {
  requested: string[];
  loaded: string[];
  failed: string[];
  skipped: string[];
}

export type LegacyAssetManifest = Record<string, string>;
export type AssetManifest = AssetCatalog | LegacyAssetManifest;

const isCatalog = (manifest: AssetManifest): manifest is AssetCatalog =>
  'entries' in manifest && Array.isArray(manifest.entries);

const assertValidEntries = (entries: readonly AssetEntry[]): void => {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!entry.id) throw new Error('Asset catalog contains an entry without an id');
    if (ids.has(entry.id)) throw new Error(`Asset catalog contains duplicate id: ${entry.id}`);
    if (!entry.src) throw new Error(`Asset ${entry.id} is missing a source`);
    ids.add(entry.id);
  }
};

export class AssetManager {
  private static assets = new Map<string, AssetEntry>();
  private static statuses = new Map<string, AssetLoadStatus>();

  static load(manifest: AssetManifest): void {
    const entries = isCatalog(manifest)
      ? manifest.entries
      : Object.entries(manifest).map(([id, src]): AssetEntry => ({
          id,
          src,
          kind: 'image',
          version: 1,
          preload: 'lazy'
        }));
    assertValidEntries(entries);
    this.assets = new Map(entries.map((entry) => [entry.id, { ...entry }]));
    this.statuses = new Map(entries.map((entry) => [entry.id, 'idle']));
  }

  static register(entry: AssetEntry): void {
    this.assets.set(entry.id, { ...entry });
    this.statuses.set(entry.id, 'idle');
  }

  static get(id: string, fallback = '◆'): string {
    return this.assets.get(id)?.src ?? fallback;
  }

  static getEntry(id: string): AssetEntry | undefined {
    const entry = this.assets.get(id);
    return entry ? { ...entry, tags: entry.tags ? [...entry.tags] : undefined } : undefined;
  }

  static getStatus(id: string): AssetLoadStatus | undefined {
    return this.statuses.get(id);
  }

  static has(id: string): boolean {
    return this.assets.has(id);
  }

  static ids(): string[] {
    return [...this.assets.keys()];
  }

  static async preloadGroup(group: AssetPreloadGroup): Promise<AssetPreloadReport> {
    const ids = [...this.assets.values()]
      .filter((entry) => entry.preload === group)
      .map((entry) => entry.id);
    return this.preload(ids);
  }

  static async preload(ids: readonly string[]): Promise<AssetPreloadReport> {
    const requested = [...new Set(ids)];
    const loaded: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    await Promise.all(requested.map(async (id) => {
      const entry = this.assets.get(id);
      if (!entry) {
        failed.push(id);
        return;
      }
      if (this.statuses.get(id) === 'loaded') {
        loaded.push(id);
        return;
      }
      if (entry.kind !== 'image' && entry.kind !== 'spritesheet') {
        skipped.push(id);
        return;
      }
      if (typeof Image === 'undefined') {
        skipped.push(id);
        return;
      }

      await new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => {
          this.statuses.set(id, 'loaded');
          loaded.push(id);
          resolve();
        };
        image.onerror = () => {
          this.statuses.set(id, 'failed');
          failed.push(id);
          resolve();
        };
        image.src = entry.src;
      });
    }));

    return { requested, loaded, failed, skipped };
  }
}
