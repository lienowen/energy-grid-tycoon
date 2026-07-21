export class AssetManager {
  private static assets: Record<string, string> = {};

  static register(id: string, path: string) {
    this.assets[id] = path;
  }

  static get(id: string) {
    return this.assets[id];
  }
}
