import type { BuildingBase, BuildingConfig } from '../../buildings/BuildingBase';
import type { CityPlotConfig } from '../../core/CityMapConfig';
import type { GameViewModel } from '../../core/GameManager';
import { CityMapSystem } from '../../systems/CityMapSystem';
import { LevelLoader } from '../../systems/LevelLoader';

export type AssetRenderer = (assetId: string, alt: string, className?: string) => string;

export interface WorldSceneRenderInput {
  view: GameViewModel;
  asset: AssetRenderer;
  selectedBuildingId?: string;
}

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const zoneLabel = (plot: CityPlotConfig): string => plot.label ?? ({
  neighborhood: '社区用地',
  industrial: '产业用地',
  coastal: '沿海用地',
  outskirts: '城郊用地',
  utility: '市政用地'
}[plot.zone]);

const facilityAbility = (building: BuildingBase): string => building.config.category === 'storage'
  ? `备用电 ${Math.round(building.storedEnergy)} / ${Math.round(building.getStorageCapacity())}`
  : `供电 ${Math.round(building.getPowerOutput())} MW`;

const selectedAbility = (config: BuildingConfig): string => config.category === 'storage'
  ? `可存 ${Math.round(config.capacity ?? 0)} 份电`
  : `增加 ${Math.round(config.power)} MW 供电`;

export const renderWorldScene = ({
  view,
  asset,
  selectedBuildingId
}: WorldSceneRenderInput): string => {
  const { state, level, activeEvent, activePolicy, lastStorage } = view;
  const presentation = level.presentation?.world;
  const plots = LevelLoader.getWorldPlots(level);
  const cityX = clampPercent(presentation?.city?.x ?? 50);
  const cityY = clampPercent(presentation?.city?.y ?? 51);
  const theme = presentation?.theme ?? 'residential';
  const selected = selectedBuildingId
    ? view.availableBuildings.find((building) => building.id === selectedBuildingId)
    : undefined;
  const storagePercent = state.storageCapacity > 0
    ? Math.round(Math.min(1, state.storageEnergy / state.storageCapacity) * 100)
    : 0;
  const storageFlow = lastStorage?.discharged
    ? '正在支援晚高峰'
    : lastStorage?.charged
      ? '正在保存多余电力'
      : state.storageCapacity > 0 ? '备用电随时待命' : '还没有备用电设施';

  const lines = plots.map((plot) => {
    const occupied = view.buildings.some((building) => building.placementId === plot.id);
    return occupied
      ? `<line class="world-grid-line energized" x1="${clampPercent(plot.x)}" y1="${clampPercent(plot.y)}" x2="${cityX}" y2="${cityY}" />`
      : '';
  }).join('');

  const plotNodes = plots.map((plot) => {
    const occupant = view.buildings.find((building) => building.placementId === plot.id);
    const check = selected
      ? CityMapSystem.canPlace(selected, plot, view.buildings)
      : undefined;
    const canPlace = Boolean(selected && check?.ok);
    const blocked = Boolean(selected && !check?.ok);
    const classes = [
      'city-plot',
      occupant ? 'occupied' : 'empty',
      canPlace ? 'available' : '',
      blocked ? 'blocked' : '',
      plot.locked ? 'locked' : '',
      `zone-${plot.zone}`,
      `depth-${plot.depth ?? 'mid'}`
    ].filter(Boolean).join(' ');
    const action = occupant
      ? `data-panel="fleet" data-focus-building="${occupant.instanceId}"`
      : canPlace
        ? `data-place-plot="${plot.id}"`
        : '';
    const art = occupant
      ? asset(occupant.config.assetId, occupant.config.name, 'city-plot-building-image')
      : selected
        ? asset(selected.assetId, selected.name, 'city-plot-ghost-image')
        : '<span class="city-plot-marker"><i></i></span>';
    const title = occupant ? occupant.config.name : canPlace ? `建设${selected?.name ?? ''}` : zoneLabel(plot);
    const detail = occupant
      ? `${facilityAbility(occupant)} · ${occupant.enabled ? '运行中' : '已关闭'}`
      : canPlace
        ? `${selectedAbility(selected as BuildingConfig)} · 点击落地`
        : blocked
          ? check?.reason ?? '不适合这个项目'
          : '先在下方选择一个项目';

    return `
      <button
        class="${classes}"
        style="--plot-x:${clampPercent(plot.x)}%;--plot-y:${clampPercent(plot.y)}%;--plot-scale:${plot.scale ?? 1};"
        ${action}
        ${plot.locked ? 'disabled' : ''}
        aria-label="${title}"
      >
        <span class="city-plot-ground"></span>
        <span class="city-plot-art">${art}</span>
        <span class="city-plot-copy"><strong>${title}</strong><small>${detail}</small></span>
      </button>
    `;
  }).join('');

  return `
    <section class="world-scene theme-${theme} ${selected ? 'placing-facility' : ''}" aria-label="${level.name}城市地图">
      <div class="world-sky-glow"></div>
      <div class="world-haze"></div>
      <div class="city-road road-a"></div>
      <div class="city-road road-b"></div>
      <div class="city-road road-c"></div>
      <svg class="world-grid-network" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>

      <div class="city-heart" style="--city-x:${cityX}%;--city-y:${cityY}%;">
        <div class="city-heart-radar" style="--supply-angle:${Math.min(360, state.supplyRatio * 360)}deg"></div>
        <div class="city-silhouette" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <strong>${level.name}</strong>
        <span>${state.population.toLocaleString('zh-CN')} 位居民 · ${Math.round(Math.min(1, state.supplyRatio) * 100)}% 街区亮灯</span>
      </div>

      ${plotNodes}

      ${selected ? `
        <aside class="placement-order">
          <span>${asset(selected.assetId, selected.name, 'placement-order-image')}</span>
          <div><small>正在选择建设位置</small><strong>${selected.name}</strong><p>地图上发亮的地块可以建设；点击地块确认。</p></div>
          <button data-cancel-build="true">取消</button>
        </aside>
      ` : ''}

      <aside class="world-mission-card">
        <span class="world-label">本城目标</span>
        <strong>${level.rules.objective.label}</strong>
        <div class="world-progress"><i style="width:${Math.round(view.goalProgress * 100)}%"></i></div>
        <small>完成 ${Math.round(view.goalProgress * 100)}%</small>
      </aside>

      <aside class="world-storage-orb ${lastStorage?.discharged ? 'discharging' : lastStorage?.charged ? 'charging' : ''}">
        <span>${storagePercent}%</span><strong>${storageFlow}</strong>
      </aside>

      <aside class="world-policy-badge">
        ${activePolicy ? asset(activePolicy.assetId, activePolicy.name, 'world-policy-image') : '<span class="world-policy-neutral">◇</span>'}
        <div><small>城市方向</small><strong>${activePolicy?.name ?? '平稳发展'}</strong></div>
      </aside>

      ${activeEvent ? `
        <aside class="world-event-card active">
          ${asset(`event_${activeEvent.config.id}`, activeEvent.config.name, 'world-event-image')}
          <div><span>城市里发生了新情况</span><strong>${activeEvent.config.name}</strong><small>${activeEvent.config.description} · 还会持续 ${Math.ceil(activeEvent.remainingHours)} 小时</small></div>
        </aside>
      ` : `
        <aside class="world-event-card quiet">
          <span class="world-event-pulse"></span>
          <div><span>城市情况</span><strong>一切正常</strong><small>继续观察居民用电和城市资金</small></div>
        </aside>
      `}
    </section>
  `;
};
