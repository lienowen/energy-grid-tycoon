import './styles.css';
import buildingData from './data/buildings.json';
import eventData from './data/events.json';
import levelData from './data/levels.json';
import policyData from './data/policies.json';
import technologyData from './data/technologies.json';
import assetData from './resources/assets.json';
import type { BuildingConfig } from './buildings/BuildingBase';
import { AppController } from './core/AppController';
import { AssetManager } from './resources/AssetManager';
import type { AssetManifest } from './resources/AssetManager';
import type { EventConfig } from './systems/EventSystem';
import type { LevelConfig } from './systems/LevelLoader';
import type { PolicyConfig } from './systems/PolicySystem';
import type { TechnologyConfig } from './systems/ResearchSystem';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root #app was not found');

AssetManager.load(assetData as unknown as AssetManifest);

const levels = levelData as unknown as LevelConfig[];
const buildings = buildingData as unknown as BuildingConfig[];
const events = eventData as unknown as EventConfig[];
const technologies = technologyData as unknown as TechnologyConfig[];
const policies = policyData as unknown as PolicyConfig[];

if (levels.length === 0) throw new Error('No level configuration is available');

new AppController(root, levels, buildings, events, technologies, policies).start();
