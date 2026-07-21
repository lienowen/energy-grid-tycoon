export type AssetKind = 'image' | 'audio' | 'font' | 'spritesheet';
export type AssetPreloadGroup = 'boot' | 'level' | 'lazy';

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
  schemaVersion: 1;
  budgetBytes: number;
  entries: AssetEntry[];
}

export type LegacyAssetManifest = Record<string, string>;
export type AssetManifest = AssetCatalog | LegacyAssetManifest;

const isCatalog = (manifest: AssetManifest): manifest is AssetCatalog =>
  'entries' in manifest && Array.isArray(manifest.entries);

export class AssetManager {
  private static assets = new Map<string, AssetEntry>();

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
    this.assets = new Map(entries.map((entry) => [entry.id, { ...entry }]));
  }

  static register(entry: AssetEntry): void {
    this.assets.set(entry.id, { ...entry });
  }

  static get(id: string, fallback = '◆'): string {
    return this.assets.get(id)?.src ?? fallback;
  }

  static getEntry(id: string): AssetEntry | undefined {
    const entry = this.assets.get(id);
    return entry ? { ...entry, tags: entry.tags ? [...entry.tags] : undefined } : undefined;
  }

  static has(id: string): boolean {
    return this.assets.has(id);
  }

  static ids(): string[] {
    return [...this.assets.keys()];
  }

  static async preloadGroup(group: AssetPreloadGroup): Promise<void> {
    const ids = [...this.assets.values()]
      .filter((entry) => entry.preload === group)
      .map((entry) => entry.id);
    await this.preload(ids);
  }

  static async preload(ids: readonly string[]): Promise<void> {
    if (typeof Image === 'undefined') return;
    const uniqueEntries = [...new Set(ids)]
      .map((id) => this.assets.get(id))
      .filter((entry): entry is AssetEntry => Boolean(entry));

    await Promise.all(uniqueEntries.map((entry) => {
      if (entry.kind !== 'image' && entry.kind !== 'spritesheet') return Promise.resolve();
      return new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = entry.src;
      });
    }));
  }
}
