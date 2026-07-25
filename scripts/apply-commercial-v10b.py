from pathlib import Path
import re


def must_sub(pattern: str, replacement: str, text: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{label}: no match')
    return updated


dashboard_path = Path('src/ui/MayorDashboard.ts')
dashboard = dashboard_path.read_text()
if "'hub'" not in dashboard.split('\n', 12)[8]:
    dashboard = dashboard.replace(
        "type MayorPanel = MayorGuidePanel | 'system' | 'none';",
        "type MayorPanel = MayorGuidePanel | 'hub' | 'system' | 'none';",
        1
    )
if "hub: '市政管理'" not in dashboard:
    dashboard = dashboard.replace(
        "  analytics: '城市情况',\n  system: '游戏设置'",
        "  analytics: '城市情况',\n  hub: '市政管理',\n  system: '游戏设置'",
        1
    )

dashboard = must_sub(
    r"  private renderToolRail\([^)]*\): string \{.*?\n  \}\n\n  private renderBuildDock",
    '''  private renderToolRail(_view: GameViewModel): string {
    return `
      <nav class="hologram-tool-rail" aria-label="城市主要工具">
        <button data-camera-home="true" title="回到城市全景"><i>◎</i><span>回城</span></button>
        <button data-presentation-toggle="true" aria-pressed="${this.presentationMode === 'grid'}" class="${this.presentationMode === 'grid' ? 'active' : ''}" title="切换城市经营与电网诊断视图"><i>⌁</i><span>${this.presentationMode === 'grid' ? '城市' : '电网'}</span></button>
        <button data-build-dock-toggle="true" aria-pressed="${this.buildDockOpen}" class="${this.buildDockOpen ? 'active' : ''}" title="打开建设设施"><i>＋</i><span>建设</span></button>
        <button data-panel="hub" class="${this.activePanel === 'hub' ? 'active' : ''}" title="打开市政管理"><i>▦</i><span>管理</span></button>
      </nav>
    `;
  }

  private renderBuildDock''',
    dashboard,
    'tool rail'
)

if "this.activePanel === 'hub'" not in dashboard:
    dashboard = dashboard.replace(
        "  private renderDrawerBody(view: GameViewModel): string {\n",
        "  private renderDrawerBody(view: GameViewModel): string {\n    if (this.activePanel === 'hub') return this.renderManagementHub(view);\n",
        1
    )

if 'private renderManagementHub' not in dashboard:
    method = '''  private renderManagementHub(view: GameViewModel): string {
    const items: Array<[Exclude<MayorPanel, 'hub' | 'none'>, string, string, string]> = [
      ['market', '居民用电', '⌁', `${view.state.powerPrice.toFixed(2)} 元 / 度`],
      ['research', '城市发展', '↑', `${view.state.unlockedTechnologyIds.length}/${view.technologies.length} 项已完成`],
      ['policy', '发展方向', '◇', view.activePolicy?.name ?? '平稳发展'],
      ['fleet', '能源设施', '▦', `${view.buildings.length} 座设施`],
      ['analytics', '城市报告', '▥', `供电 ${Math.round(view.state.supplyRatio * 100)}%`],
      ['system', '游戏设置', '⚙', '存档与城市列表']
    ];
    return `
      <div class="hologram-management-grid">
        ${items.map(([panel, label, icon, detail]) => `
          <button data-panel="${panel}">
            <i>${icon}</i>
            <span><strong>${label}</strong><small>${detail}</small></span>
            <em>›</em>
          </button>
        `).join('')}
      </div>
    `;
  }

'''
    dashboard = dashboard.replace('  private renderResidentPower(view: GameViewModel): string {', method + '  private renderResidentPower(view: GameViewModel): string {', 1)

dashboard_path.write_text(dashboard)

css_path = Path('src/ui/hologram-sandbox.css')
css = css_path.read_text()
css = css.replace('  gap: 6px;\n}\n.hologram-tool-rail button {', '  gap: 9px;\n}\n.hologram-tool-rail button {', 1)
css = css.replace('  width: 64px;\n  min-height: 48px;', '  width: 62px;\n  min-height: 52px;', 1)
if '.hologram-management-grid {' not in css:
    marker = '.hologram-tool-rail span { overflow: hidden; font-size: 8px; white-space: nowrap; text-overflow: ellipsis; }\n'
    styles = '''
.hologram-management-grid { display: grid; gap: 9px; }
.hologram-management-grid > button {
  width: 100%; min-height: 64px; display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 18px;
  align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid rgba(100, 207, 249, .2); border-radius: 12px;
  color: #eaf7ff; text-align: left;
  background: linear-gradient(145deg, rgba(10, 43, 62, .72), rgba(3, 24, 38, .86));
  cursor: pointer;
}
.hologram-management-grid > button:hover {
  border-color: color-mix(in srgb, var(--scenario-accent) 72%, transparent);
  background: color-mix(in srgb, var(--scenario-accent) 12%, rgba(3, 24, 38, .9));
  transform: translateX(-3px);
}
.hologram-management-grid i { color: var(--scenario-accent); font-size: 20px; font-style: normal; text-align: center; }
.hologram-management-grid strong, .hologram-management-grid small { display: block; }
.hologram-management-grid strong { font-size: 13px; }
.hologram-management-grid small { margin-top: 4px; color: #7f9eaf; font-size: 9px; }
.hologram-management-grid em { color: #6d92a8; font-size: 20px; font-style: normal; text-align: right; }
'''
    if marker not in css:
        raise RuntimeError('tool rail style marker missing')
    css = css.replace(marker, marker + styles, 1)
css_path.write_text(css)

world_path = Path('src/presentation/pixi/ImmersivePixiWorld.ts')
world = world_path.read_text()
world = world.replace(
    "width: commercial && node.kind === 'substation' ? 154 : node.kind === 'substation' ? 142 : 92,",
    "width: commercial && node.kind === 'substation' ? 208 : node.kind === 'substation' ? 142 : 92,",
    1
)
if "commercial && node.kind === 'substation' ? 208" not in world:
    raise RuntimeError('substation scale update failed')
world_path.write_text(world)

base_path = Path('public/assets/commercial/environment/dawn-city-base.svg')
base = base_path.read_text()
for old, new in {'28': '22', '22': '17', '18': '13', '19': '15', '13': '10', '11': '7.5'}.items():
    base = re.sub(r'(<path[^>]*stroke-width=")' + old + r'(")', r'\g<1>' + new + r'\2', base)
base = base.replace('stroke-width="1.5" stroke-linecap="round" opacity="0.36"', 'stroke-width="1.1" stroke-linecap="round" opacity="0.24"')
base = base.replace('stroke-width="0.9" stroke-linecap="round" opacity="0.16"', 'stroke-width="0.7" stroke-linecap="round" opacity="0.1"')
base_path.write_text(base)

Path('scripts/apply-commercial-v10b.py').unlink()
print('V10 hierarchy pass applied')
