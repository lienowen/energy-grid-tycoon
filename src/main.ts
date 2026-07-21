import './styles.css';
import buildingData from './data/buildings.json';
import eventData from './data/events.json';
import levelData from './data/levels.json';
import assetData from './resources/assets.json';
import { BuildingConfig } from './buildings/BuildingBase';
import { GameManager } from './core/GameManager';
import { AssetManager, AssetManifest } from './resources/AssetManager';
import { EventConfig } from './systems/EventSystem';
import { LevelConfig } from './systems/LevelLoader';
import { Dashboard } from './ui/Dashboard';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root #app was not found');

AssetManager.load(assetData as AssetManifest);

const levels = levelData as LevelConfig[];
const buildings = buildingData as BuildingConfig[];
const events = eventData as EventConfig[];
const firstLevel = levels[0];
if (!firstLevel) throw new Error('No level configuration is available');

let game!: GameManager;
const dashboard = new Dashboard(root, {
  onBuild: (configId) => game.build(configId),
  onSpeedChange: (speed) => game.setSpeed(speed),
  onPriceChange: (price) => game.setPowerPrice(price)
});

game = new GameManager(firstLevel, buildings, events, (view) => dashboard.render(view));
game.start();

window.addEventListener('beforeunload', () => game.destroy());