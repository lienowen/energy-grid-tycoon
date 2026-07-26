import type { GameViewModel } from '../core/GameManager';
import { GridNetworkRegistry } from '../systems/GridNetworkRegistry';

export interface GridOperationsResult {
  ok: boolean;
  reason?: string;
}

export interface GridOperationsActions {
  onToggleEdge: (edgeId: string) => GridOperationsResult;
  onRepairEdge: (edgeId: string) => GridOperationsResult;
}

const percent = (value: number | undefined): string =>
  `${Math.round(Math.max(0, value ?? 0) * 100)}%`;

const money = (value: number): string =>
  `¥${Math.round(value).toLocaleString('zh-CN')}`;

export class GridOperationsPanel {
  private element?: HTMLElement;
  private lastView?: GameViewModel;
  private expanded = true;
  private initialized = false;
  private message = '';

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: GridOperationsActions
  ) {}

  render(view: GameViewModel): void {
    this.lastView = view;
    const network = GridNetworkRegistry.resolve(view.level.id);
    if (!network) {
      this.destroy();
      return;
    }

    const edges = network.edges
      .filter((edge) => edge.controllable || (edge.repairCost ?? 0) > 0)
      .sort((left, right) => {
        const leftFaulted = view.state.gridEdgeFaulted?.[left.id] ?? left.initialFaulted ?? false;
        const rightFaulted = view.state.gridEdgeFaulted?.[right.id] ?? right.initialFaulted ?? false;
        if (leftFaulted !== rightFaulted) return Number(rightFaulted) - Number(leftFaulted);
        if (left.role !== right.role) {
          if (left.role === 'tie') return -1;
          if (right.role === 'tie') return 1;
        }
        return left.id.localeCompare(right.id);
      });
    const enabledById = new Map(edges.map((edge) => [
      edge.id,
      view.state.gridEdgeEnabled?.[edge.id]
        ?? edge.initialEnabled
        ?? edge.enabled
        ?? true
    ]));
    const faultedById = new Map(edges.map((edge) => [
      edge.id,
      view.state.gridEdgeFaulted?.[edge.id] ?? edge.initialFaulted ?? false
    ]));
    const faultCount = [...faultedById.values()].filter(Boolean).length;
    const openCount = edges.filter((edge) => !faultedById.get(edge.id) && !enabledById.get(edge.id)).length;
    if (!this.initialized) {
      this.expanded = faultCount > 0 || openCount > 0;
      this.initialized = true;
    }

    const dispatchById = new Map(
      (view.lastPower?.gridDispatch?.edges ?? []).map((edge) => [edge.edgeId, edge])
    );
    const nodeById = new Map(network.nodes.map((node) => [node.id, node]));
    const panel = this.ensureElement();
    panel.classList.toggle('collapsed', !this.expanded);
    const summary = faultCount > 0
      ? `${faultCount} 条故障 · ${openCount} 条分闸`
      : openCount > 0
        ? `${openCount} 条线路分闸`
        : '关键线路运行中';
    panel.innerHTML = `
      <header>
        <button class="grid-operations-toggle" type="button" data-grid-panel-toggle="true" aria-expanded="${this.expanded}">
          <span><i></i><b>电网调度</b><small>${summary}</small></span>
          <em>${this.expanded ? '收起' : '展开'}</em>
        </button>
      </header>
      <div class="grid-operations-body">
        <p>先投入备用联络线临时转供，再安排抢修恢复主线路。所有操作都会立即改变城区供电。</p>
        ${this.message ? `<div class="grid-operations-message">${this.message}</div>` : ''}
        <div class="grid-operations-list">
          ${edges.map((edge) => {
            const enabled = enabledById.get(edge.id) ?? true;
            const faulted = faultedById.get(edge.id) ?? false;
            const dispatch = dispatchById.get(edge.id);
            const visualStatus = faulted
              ? 'faulted'
              : !enabled
                ? 'offline'
                : dispatch?.status === 'overload'
                  ? 'overload'
                  : 'normal';
            const roleLabel = edge.role === 'tie' ? '备用联络线' : edge.role === 'backbone' ? '主干线路' : '供电线路';
            const statusText = faulted
              ? `线路故障 · 抢修后恢复额定容量`
              : !enabled
                ? `${roleLabel} · 当前分闸`
                : dispatch?.status === 'overload'
                  ? `${roleLabel} · 容量已满 ${percent(dispatch.loadRatio)}`
                  : `${roleLabel} · 当前负载 ${percent(dispatch?.loadRatio)}`;
            const from = nodeById.get(edge.from)?.label ?? edge.from;
            const to = nodeById.get(edge.to)?.label ?? edge.to;
            const repairCost = Math.max(0, edge.repairCost ?? 0);
            const action = faulted
              ? `<button type="button" data-grid-edge-repair="${edge.id}" class="repair" ${view.state.money < repairCost ? 'disabled' : ''}>抢修 ${money(repairCost)}</button>`
              : `<button type="button" data-grid-edge-toggle="${edge.id}" class="${enabled ? 'open' : 'close'}">${enabled ? '分闸' : '合闸'}</button>`;
            return `
              <article class="grid-operation ${visualStatus}">
                <span class="grid-operation-state"><i></i></span>
                <div>
                  <strong>${from} → ${to}</strong>
                  <small>${statusText}</small>
                  <span class="grid-operation-meter"><i style="width:${enabled && !faulted ? percent(dispatch?.loadRatio) : '0%'}"></i></span>
                </div>
                ${action}
              </article>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  destroy(): void {
    this.element?.removeEventListener('click', this.handleClick);
    this.element?.remove();
    this.element = undefined;
    this.lastView = undefined;
    this.initialized = false;
    this.message = '';
  }

  private ensureElement(): HTMLElement {
    if (this.element) return this.element;
    const panel = document.createElement('aside');
    panel.className = 'grid-operations-panel';
    panel.setAttribute('aria-label', '电网线路调度');
    panel.addEventListener('click', this.handleClick);
    this.root.append(panel);
    this.element = panel;
    return panel;
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-grid-panel-toggle]')) {
      this.expanded = !this.expanded;
      if (this.lastView) this.render(this.lastView);
      return;
    }

    const repairButton = target.closest<HTMLButtonElement>('[data-grid-edge-repair]');
    const repairEdgeId = repairButton?.dataset.gridEdgeRepair;
    if (repairEdgeId) {
      const result = this.actions.onRepairEdge(repairEdgeId);
      this.message = result.ok ? '主线路抢修完成，已恢复送电。' : result.reason ?? '线路抢修失败';
      if (this.lastView) this.render(this.lastView);
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-grid-edge-toggle]');
    const edgeId = button?.dataset.gridEdgeToggle;
    if (!edgeId) return;
    const result = this.actions.onToggleEdge(edgeId);
    this.message = result.ok ? '' : result.reason ?? '线路操作失败';
    if (this.lastView) this.render(this.lastView);
  };
}
