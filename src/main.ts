import './styles.css';
import './asset-presentation.css';
import './mayor-game.css';
import './player-city.css';
import buildingData from './data/buildings.json';
import eventData from './data/events.json';
import levelData from './data/levels.json';
import policyData from './data/policies.json';
import technologyData from './data/technologies.json';
import assetCatalogData from './resources/asset-catalog.json';
import type { BuildingConfig } from './buildings/BuildingBase';
import { AppController } from './core/AppController';
import { GameConfigValidator } from './core/GameConfigValidator';
import { AssetManager } from './resources/AssetManager';
import type { AssetCatalog } from './resources/AssetManager';
import type { EventConfig } from './systems/EventSystem';
import type { LevelConfig } from './systems/LevelLoader';
import type { PolicyConfig } from './systems/PolicySystem';
import type { TechnologyConfig } from './systems/ResearchSystem';
import { LoadingScreen } from './ui/LoadingScreen';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root #app was not found');

document.addEventListener('error', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || !target.classList.contains('asset-image')) return;
  target.classList.add('asset-load-failed');
  target.parentElement?.classList.add('asset-fallback');
}, true);

const bootstrap = async (): Promise<void> => {
  LoadingScreen.render(root, '正在打开城市地图', '准备可建设用地和城市设施。');
  AssetManager.load(assetCatalogData as unknown as AssetCatalog);

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

  const bootAssets = await AssetManager.preloadGroup('boot');
  if (bootAssets.failed.length > 0) console.warn('Boot assets failed to preload:', bootAssets.failed);

  const gridPattern = AssetManager.get('ui_grid_pattern', '');
  if (gridPattern) document.documentElement.style.setProperty('--ui-grid-pattern', `url("${gridPattern}")`);

  new AppController(root, levels, buildings, events, technologies, policies).start();
};

void bootstrap().catch((error: unknown) => LoadingScreen.renderError(root, error));
