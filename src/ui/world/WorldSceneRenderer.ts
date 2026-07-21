import type { BuildingConfig } from '../../buildings/BuildingBase';
import type { GameViewModel } from '../../core/GameManager';
import type { LevelWorldSlotConfig } from '../../systems/LevelLoader';

export type AssetRenderer = (assetId: string, alt: string, className?: string) => string;

export interface WorldSceneRenderInput {
  view: GameViewModel;
  buildingCounts: ReadonlyMap<string, number>;
  asset: AssetRenderer;
}

const defaultSlots: LevelWorldSlotConfig[] = [
  { x: 14, y: 31, scale: 0.92, depth: 'far' },
  { x: 78, y: 27, scale: 0.94, depth: 'far' },
  { x: 12, y: 65, scale: 1.04, depth: 'near' },
  { x: 79, y: 66, scale: 1.05, depth: 'near' },
  { x: 31, y: 76, scale: 1, depth: 'near' },
  { x: 62, y: 78, scale: 1, depth: 'near' },
  { x: 47, y: 24, scale: 0.9, depth: 'far' }
];

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const buildingOutput = (config: BuildingConfig): string => config.category === 'storage'
  ? `${Math.round(config.capacity ?? 0)} MWh`
  : `${Math.round(config.power)} MW`;

const sceneSlot = (slots: readonly LevelWorldSlotConfig[], index: number): LevelWorldSlotConfig =>
  slots[index] ?? defaultSlots[index % defaultSlots.length] ?? { x: 50, y: 50 };

export const renderWorldScene = ({ view, buildingCounts, asset }: WorldSceneRenderInput): string => {
  const { state, level, availableBuildings, activeEvent, activePolicy, lastStorage } = view;
  const presentation = level.presentation?.world;
  const slots = presentation?.slots?.length ? presentation.slots : defaultSlots;
  const cityX = clampPercent(presentation?.city?.x ?? 50);
  const cityY = clampPercent(presentation?.city?.y ?? 51);
  const theme = presentation?.theme ?? 'residential';
  const supplyPercent = Math.round(Math.min(1, state.supplyRatio) * 100);
  const storagePercent = state.storageCapacity > 0
    ? Math.round(Math.min(1, state.storageEnergy / state.storageCapacity) * 100)
    : 0;
  const storageFlow = lastStorage?.discharged
    ? `放电 ${Math.round(lastStorage.discharged)} MWh`
    : lastStorage?.charged
      ? `充电 ${Math.round(lastStorage.charged)} MWh`
      : '储能待机';

  const lines = availableBuildings.map((config, index) => {
    const slot = sceneSlot(slots, index);
    const count = buildingCounts.get(config.id) ?? 0;
    return `<line class="world-grid-line ${count > 0 ? 'energized' : ''}" x1="${clampPercent(slot.x)}" y1="${clampPercent(slot.y)}" x2="${cityX}" y2="${cityY}" />`;
  }).join('');

  const nodes = availableBuildings.map((config, index) => {
    const slot = sceneSlot(slots, index);
    const count = buildingCounts.get(config.id) ?? 0;
    const depth = slot.depth ?? 'mid';
    const scale = slot.scale ?? 1;
    const action = count > 0 ? 'data-panel="fleet"' : `data-build="${config.id}"`;
    const status = count > 0 ? `运行 ×${count}` : '点击建设';

    return `
      <button
        class="world-building ${count > 0 ? 'occupied' : 'empty'} depth-${depth}"
        style="--world-x:${clampPercent(slot.x)}%;--world-y:${clampPercent(slot.y)}%;--world-scale:${scale};"
        ${action}
        aria-label="${count > 0 ? `查看${config.name}资产` : `建设${config.name}`}"
      >
        <span class="world-building-glow"></span>
        <span class="world-building-art">${asset(config.assetId, config.name, 'world-building-image')}</span>
        <span class="world-building-copy">
          <strong>${config.name}</strong>
          <small>${buildingOutput(config)} · ${status}</small>
        </span>
      </button>
    `;
  }).join('');

  return `
    <section class="world-scene theme-${theme}" aria-label="${level.name}能源城市">
      <div class="world-sky-glow"></div>
      <div class="world-haze"></div>
      <svg class="world-grid-network" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${lines}
      </svg>

      <div class="city-heart" style="--city-x:${cityX}%;--city-y:${cityY}%;">
        <div class="city-heart-radar" style="--supply-angle:${Math.min(360, state.supplyRatio * 360)}deg"></div>
        <div class="city-silhouette" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <strong>${level.name}</strong>
        <span>${state.population.toLocaleString('zh-CN')} 人 · 供电 ${supplyPercent}%</span>
      </div>

      ${nodes}

      <aside class="world-mission-card">
        <span class="world-label">当前任务</span>
        <strong>${level.rules.objective.label}</strong>
        <div class="world-progress"><i style="width:${Math.round(view.goalProgress * 100)}%"></i></div>
        <small>完成度 ${Math.round(view.goalProgress * 100)}%</small>
      </aside>

      <aside class="world-storage-orb ${lastStorage?.discharged ? 'discharging' : lastStorage?.charged ? 'charging' : ''}">
        <span>${storagePercent}%</span>
        <strong>${storageFlow}</strong>
      </aside>

      <aside class="world-policy-badge">
        ${activePolicy ? asset(activePolicy.assetId, activePolicy.name, 'world-policy-image') : '<span class="world-policy-neutral">◇</span>'}
        <div><small>城市方向</small><strong>${activePolicy?.name ?? '市场常态'}</strong></div>
      </aside>

      ${activeEvent ? `
        <aside class="world-event-card active">
          ${asset(`event_${activeEvent.config.id}`, activeEvent.config.name, 'world-event-image')}
          <div>
            <span>城市事件</span>
            <strong>${activeEvent.config.name}</strong>
            <small>${activeEvent.config.description} · ${Math.ceil(activeEvent.remainingHours)} 小时</small>
          </div>
        </aside>
      ` : `
        <aside class="world-event-card quiet">
          <span class="world-event-pulse"></span>
          <div><span>城市态势</span><strong>运行平稳</strong><small>天气、负荷与电网均在监测中</small></div>
        </aside>
      `}
    </section>
  `;
};
