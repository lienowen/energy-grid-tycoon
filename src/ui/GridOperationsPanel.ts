import type { GameViewModel } from '../core/GameManager';
import { GridNetworkRegistry } from '../systems/GridNetworkRegistry';

export interface GridOperationsResult {
  ok: boolean;
  reason?: string;
}

export interface GridOperationsActions {
  onToggleEdge: (edgeId: string) => GridOperationsResult;
}

const controllableEdgeIds = new Set([
  'main-to-west',
  'west-to-east',
  'east-to-industrial',
  'east-to-public',
  'east-to-old-town'
]);

const percent = (value: number | undefined): string =>
  `${Math.round(Math.max(0, value ?? 0) * 100)}%`;

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

    const edges = network.edges.filter((edge) => controllableEdgeIds.has(edge.id));
    const enabledById = new Map(edges.map((edge) => [
      edge.id,
      view.state.gridEdgeEnabled?.[edge.id] ?? edge.enabled ?? true
    ]));
    const offlineCount = [...enabledById.values()].filter((enabled) => !enabled).length;
    if (!this.initialized) {
      this.expanded = offlineCount > 0;
      this.initialized = true;
    }

    const dispatchById = new Map(
      (view.lastPower?.gridDispatch?.edges ?? []).map((edge) => [edge.edgeId, edge])
    );
    const nodeById = new Map(network.nodes.map((node) => [node.id, node]));
    const panel = this.ensureElement();
    panel.classList.toggle('collapsed', !this.expanded);
    panel.innerHTML = `
      <header>
        <button class="grid-operations-toggle" type="button" data-grid-panel-toggle="true" aria-expanded="${this.expanded}">
          <span><i></i><b>电网调度</b><small>${offlineCount > 0 ? `${offlineCount} 条线路断开` : '线路运行中'}</small></span>
          <em>${this.expanded ? '收起' : '展开'}</em>
        </button>
      </header>
      <div class="grid-operations-body">
        <p>线路状态直接影响城区供电。合闸恢复供电，分闸用于故障隔离和转供。</p>
        ${this.message ? `<div class="grid-operations-message">${this.message}</div>` : ''}
        <div class="grid-operations-list">
          ${edges.map((edge) => {
            const enabled = enabledById.get(edge.id) ?? true;
            const dispatch = dispatchById.get(edge.id);
            const visualStatus = !enabled
              ? 'offline'
              : dispatch?.status === 'overload'
                ? 'overload'
                : 'normal';
            const statusText = !enabled
              ? '线路断开'
              : dispatch?.status === 'overload'
                ? `容量已满 ${percent(dispatch.loadRatio)}`
                : `当前负载 ${percent(dispatch?.loadRatio)}`;
            const from = nodeById.get(edge.from)?.label ?? edge.from;
            const to = nodeById.get(edge.to)?.label ?? edge.to;
            return `
              <article class="grid-operation ${visualStatus}">
                <span class="grid-operation-state"><i></i></span>
                <div>
                  <strong>${from} → ${to}</strong>
                  <small>${statusText}</small>
                  <span class="grid-operation-meter"><i style="width:${enabled ? percent(dispatch?.loadRatio) : '0%'}"></i></span>
                </div>
                <button type="button" data-grid-edge-toggle="${edge.id}" class="${enabled ? 'open' : 'close'}">
                  ${enabled ? '分闸' : '合闸'}
                </button>
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

    const button = target.closest<HTMLButtonElement>('[data-grid-edge-toggle]');
    const edgeId = button?.dataset.gridEdgeToggle;
    if (!edgeId) return;
    const result = this.actions.onToggleEdge(edgeId);
    this.message = result.ok ? '' : result.reason ?? '线路操作失败';
    if (this.lastView) this.render(this.lastView);
  };
}
