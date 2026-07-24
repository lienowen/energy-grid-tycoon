import './styles.css';
import './asset-presentation.css';
import './mayor-game.css';
import './player-city.css';
import './ui/hologram-sandbox.css';
import './ui/pixi-world.css';
import './ui/release-polish.css';
import './ui/dawn-city-experience.css';
import './ui/immersive-world.css';
import buildingData from './data/buildings.json';
import eventData from './data/events.json';
import levelData from './data/levels.json';
import policyData from './data/policies.json';
import technologyData from './data/technologies.json';
import type { BuildingConfig } from './buildings/BuildingBase';
import { AppController } from './core/AppController';
import { GameConfigValidator } from './core/GameConfigValidator';
import { HologramConfigValidator } from './core/HologramConfigValidator';
import { AssetManager } from './resources/AssetManager';
import { globalAssetCatalog } from './resources/GlobalAssetCatalog';
import type { EventConfig } from './systems/EventSystem';
import type { LevelConfig } from './systems/LevelLoader';
import type { PolicyConfig } from './systems/PolicySystem';
import type { TechnologyConfig } from './systems/ResearchSystem';
import { LoadingScreen } from './ui/LoadingScreen';
import { RuntimeRecovery } from './ui/RuntimeRecovery';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root #app was not found');

let controller: AppController | undefined;
let fatalReported = false;

const reportFatal = (error: unknown): void => {
  if (fatalReported) return;
  fatalReported = true;
  const saved = controller?.emergencySave() ?? false;
  RuntimeRecovery.render(root, error, saved);
};

document.addEventListener('error', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || !target.classList.contains('asset-image')) return;
  target.classList.add('asset-load-failed');
  target.parentElement?.classList.add('asset-fallback');
}, true);

window.addEventListener('error', (event) => {
  if (event.error) reportFatal(event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  reportFatal(event.reason);
});

const registerServiceWorker = async (): Promise<void> => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.warn('Offline support could not be enabled:', error);
  }
};

const bootstrap = async (): Promise<void> => {
  LoadingScreen.render(root, '正在启动全息城市沙盘', '准备城市模型、可建设区域和居民生活状态。');
  AssetManager.load(globalAssetCatalog);

  const levels = levelData as unknown as LevelConfig[];
  const buildings = buildingData as unknown as BuildingConfig[];
  const events = eventData as unknown as EventConfig[];
  const technologies = technologyData as unknown as TechnologyConfig[];
  const policies = policyData as unknown as PolicyConfig[];

  GameConfigValidator.assertValid({
    levels,
    buildings,
    events,
    technologies,
    policies,
    assetIds: new Set(AssetManager.ids())
  });
  HologramConfigValidator.assertValid(levels);

  const bootAssets = await AssetManager.preloadGroup('boot');
  if (bootAssets.failed.length > 0) console.warn('Boot assets failed to preload:', bootAssets.failed);

  const gridPattern = AssetManager.get('ui_grid_pattern', '');
  if (gridPattern) document.documentElement.style.setProperty('--ui-grid-pattern', `url("${gridPattern}")`);

  controller = new AppController(root, levels, buildings, events, technologies, policies);
  controller.start();
  void registerServiceWorker();

  void AssetManager.preloadGroup('level').then((report) => {
    if (report.failed.length > 0) console.warn('Level assets failed to preload:', report.failed);
  });
};

void bootstrap().catch(reportFatal);
