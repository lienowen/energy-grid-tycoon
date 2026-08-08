import './styles.css';
import './ui/release-polish.css';
import './battle/battle-pack.css';
import './battle/battle-mobile.css';
import './battle/battle-tuning.css';
import './battle/battle-commercial-mobile.css';
import type { BuildingConfig } from './buildings/BuildingBase';
import type { AppController } from './core/AppController';
import type { EventConfig } from './systems/EventSystem';
import type { LevelConfig } from './systems/LevelLoader';
import type { PolicyConfig } from './systems/PolicySystem';
import type { TechnologyConfig } from './systems/ResearchSystem';
import { RuntimeRecovery } from './ui/RuntimeRecovery';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root #app was not found');

let controller: AppController | undefined;
let battleApp: { start(): void; destroy(): void } | undefined;
let fatalReported = false;

const reportFatal = (error: unknown): void => {
  if (fatalReported) return;
  fatalReported = true;
  battleApp?.destroy();
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
window.addEventListener('pagehide', () => battleApp?.destroy());

const registerServiceWorker = async (): Promise<void> => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.warn('Offline support could not be enabled:', error);
  }
};

const loadTycoonPresentationCss = async (): Promise<void> => {
  await Promise.all([
    import('./asset-presentation.css'),
    import('./mayor-game.css'),
    import('./player-city.css'),
    import('./ui/hologram-sandbox.css'),
    import('./ui/pixi-world.css'),
    import('./ui/dawn-city-experience.css'),
    import('./ui/city-recovery-feedback.css'),
    import('./ui/immersive-world.css'),
    import('./ui/product-first-reset.css'),
    import('./ui/game-shell.css'),
    import('./ui/gameplay-polish.css'),
    import('./ui/city01-safe-area.css'),
    import('./ui/city01-art-v2.css')
  ]);
};

const bootstrapBattle = async (): Promise<void> => {
  const [
    { AssetManager },
    { city01GridDefenseAssetCatalog }
  ] = await Promise.all([
    import('./resources/AssetManager'),
    import('./resources/City01GridDefenseAssetCatalog')
  ]);

  // BattleAssetCatalog resolves some URLs during module initialization, so the battle catalog must exist first.
  AssetManager.load(city01GridDefenseAssetCatalog);

  const { prepareGridDefenseAssets } = await import('./battle/BattleAssetPreprocessor');
  await prepareGridDefenseAssets();

  const { BattleApp } = await import('./battle/BattleApp');
  battleApp = new BattleApp(root);
  battleApp.start();
};

const bootstrapTycoon = async (): Promise<void> => {
  await loadTycoonPresentationCss();

  const [
    { default: buildingData },
    { default: eventData },
    { default: levelData },
    { default: policyData },
    { default: technologyData },
    { AppController: AppControllerRuntime },
    { GameConfigValidator },
    { HologramConfigValidator },
    { CITY01_ART_V2 },
    { AssetManager },
    { globalAssetCatalog },
    { CITY01_ART_V2_SHELL },
    { LoadingScreen }
  ] = await Promise.all([
    import('./data/buildings.json'),
    import('./data/events.json'),
    import('./data/levels.json'),
    import('./data/policies.json'),
    import('./data/technologies.json'),
    import('./core/AppController'),
    import('./core/GameConfigValidator'),
    import('./core/HologramConfigValidator'),
    import('./presentation/art-v2/City01ArtV2Theme'),
    import('./resources/AssetManager'),
    import('./resources/GlobalAssetCatalog'),
    import('./ui/City01ArtV2ShellContract'),
    import('./ui/LoadingScreen')
  ]);

  document.documentElement.dataset.artDirection = CITY01_ART_V2_SHELL.scope;
  document.documentElement.dataset.artThemeRevision = CITY01_ART_V2.revision;
  document.documentElement.dataset.artVersion = CITY01_ART_V2_SHELL.majorVersion;

  AssetManager.load(globalAssetCatalog);
  LoadingScreen.render(root, '正在加载曙光新城', '准备地形、能源设施和城市运行状态。');

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

  controller = new AppControllerRuntime(root, levels, buildings, events, technologies, policies);
  controller.start();
  void registerServiceWorker();

  void AssetManager.preloadGroup('level').then((report) => {
    if (report.failed.length > 0) console.warn('Level assets failed to preload:', report.failed);
  });
};

const bootstrap = async (): Promise<void> => {
  const requestedMode = new URLSearchParams(window.location.search).get('mode');
  if (requestedMode === 'tycoon') {
    await bootstrapTycoon();
    return;
  }
  await bootstrapBattle();
};

void bootstrap().catch(reportFatal);
