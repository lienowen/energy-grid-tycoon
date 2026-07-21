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
  ? `可存 ${Math.round(config.capacity ?? 0)} MWh`
  : `可供 ${Math.round(config.power)} MW`;

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
    ? `正在支援居民用电 · ${Math.round(lastStorage.discharged)} MWh`
    : lastStorage?.charged
      ? `正在储存多余电力 · ${Math.round(lastStorage.charged)} MWh`
      : state.storageCapacity > 0 ? '备用电力正在待命' : '城市还没有备用电力';

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
    const status = count > 0 ? `已有 ${count} 座` : '点这里开工';

    return `
      <button
        class="world-building ${count > 0 ? 'occupied' : 'empty'} depth-${depth}"
        style="--world-x:${clampPercent(slot.x)}%;--world-y:${clampPercent(slot.y)}%;--world-scale:${scale};"
        ${action}
        aria-label="${count > 0 ? `查看${config.name}` : `建设${config.name}`}"
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
    <section class="world-scene theme-${theme}" aria-label="${level.name}城市全景">
      <div class="world-sky-glow"></div>
      <div class="world-haze"></div>
      <svg class="world-grid-network" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>

      <div class="city-heart" style="--city-x:${cityX}%;--city-y:${cityY}%;">
        <div class="city-heart-radar" style="--supply-angle:${Math.min(360, state.supplyRatio * 360)}deg"></div>
        <div class="city-silhouette" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <strong>${level.name}</strong>
        <span>${state.population.toLocaleString('zh-CN')} 位居民 · ${supplyPercent}% 街区亮灯</span>
      </div>

      ${nodes}

      <aside class="world-mission-card">
        <span class="world-label">你的市长承诺</span>
        <strong>${level.rules.objective.label}</strong>
        <div class="world-progress"><i style="width:${Math.round(view.goalProgress * 100)}%"></i></div>
        <small>已经完成 ${Math.round(view.goalProgress * 100)}%</small>
      </aside>

      <aside class="world-storage-orb ${lastStorage?.discharged ? 'discharging' : lastStorage?.charged ? 'charging' : ''}">
        <span>${storagePercent}%</span>
        <strong>${storageFlow}</strong>
      </aside>

      <aside class="world-policy-badge">
        ${activePolicy ? asset(activePolicy.assetId, activePolicy.name, 'world-policy-image') : '<span class="world-policy-neutral">◇</span>'}
        <div><small>当前施政方向</small><strong>${activePolicy?.name ?? '暂未选择'}</strong></div>
      </aside>

      ${activeEvent ? `
        <aside class="world-event-card active">
          ${asset(`event_${activeEvent.config.id}`, activeEvent.config.name, 'world-event-image')}
          <div>
            <span>市民来报</span>
            <strong>${activeEvent.config.name}</strong>
            <small>${activeEvent.config.description} · 预计还会持续 ${Math.ceil(activeEvent.remainingHours)} 小时</small>
          </div>
        </aside>
      ` : `
        <aside class="world-event-card quiet">
          <span class="world-event-pulse"></span>
          <div><span>市民生活</span><strong>目前一切平稳</strong><small>市政团队会及时告诉你新的情况</small></div>
        </aside>
      `}
    </section>
  `;
};
