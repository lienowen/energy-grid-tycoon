export type AssetManifest = Record<string, string>;

export class AssetManager {
  private static assets: AssetManifest = {};

  static load(manifest: AssetManifest): void {
    this.assets = { ...manifest };
  }

  static register(id: string, value: string): void {
    this.assets[id] = value;
  }

  static get(id: string, fallback = '◆'): string {
    return this.assets[id] ?? fallback;
  }

  static has(id: string): boolean {
    return id in this.assets;
  }
}