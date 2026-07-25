from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


dashboard_path = Path('src/ui/MayorDashboard.ts')
dashboard = dashboard_path.read_text()
dashboard = replace_once(
    dashboard,
    "type MayorPanel = MayorGuidePanel | 'system' | 'none';",
    "type MayorPanel = MayorGuidePanel | 'hub' | 'system' | 'none';",
    'MayorPanel union'
)
dashboard = replace_once(
    dashboard,
    "  analytics: '城市情况',\n  system: '游戏设置'",
    "  analytics: '城市情况',\n  hub: '市政管理',\n  system: '游戏设置'",
    'panel labels'
)

tool_pattern = re.compile(
    r"  private renderToolRail\(view: GameViewModel\): string \{.*?\n  \}\n\n  private renderBuildDock",
    re.S
)
tool_replacement = '''  private renderToolRail(_view: GameViewModel): string {
    return `
      <nav class="hologram-tool-rail" aria-label="城市主要工具">
        <button data-camera-home="true" title="回到城市全景"><i>◎</i><span>回城</span></button>
        <button data-presentation-toggle="true" aria-pressed="${this.presentationMode === 'grid'}" class="${this.presentationMode === 'grid' ? 'active' : ''}" title="切换城市经营与电网诊断视图"><i>⌁</i><span>${this.presentationMode === 'grid' ? '城市' : '电网'}</span></button>
        <button data-build-dock-toggle="true" aria-pressed="${this.buildDockOpen}" class="${this.buildDockOpen ? 'active' : ''}" title="打开建设设施"><i>＋</i><span>建设</span></button>
        <button data-panel="hub" class="${this.activePanel === 'hub' ? 'active' : ''}" title="打开市政管理"><i>▦</i><span>管理</span></button>
      </nav>
    `;
  }

  private renderBuildDock'''
dashboard, count = tool_pattern.subn(tool_replacement, dashboard, count=1)
if count != 1:
    raise RuntimeError(f'renderToolRail: expected one replacement, found {count}')

dashboard = replace_once(
    dashboard,
    "  private renderDrawerBody(view: GameViewModel): string {\n    if (this.activePanel === 'research') return this.renderUpgrades(view);",
    "  private renderDrawerBody(view: GameViewModel): string {\n    if (this.activePanel === 'hub') return this.renderManagementHub(view);\n    if (this.activePanel === 'research') return this.renderUpgrades(view);",
    'drawer hub route'
)

hub_method = '''  private renderManagementHub(view: GameViewModel): string {
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
dashboard = replace_once(
    dashboard,
    '  private renderResidentPower(view: GameViewModel): string {',
    hub_method + '  private renderResidentPower(view: GameViewModel): string {',
    'management hub method'
)
dashboard_path.write_text(dashboard)

css_path = Path('src/ui/hologram-sandbox.css')
css = css_path.read_text()
css = replace_once(
    css,
    ".hologram-tool-rail span { overflow: hidden; font-size: 8px; white-space: nowrap; text-overflow: ellipsis; }\n",
    ".hologram-tool-rail span { overflow: hidden; font-size: 8px; white-space: nowrap; text-overflow: ellipsis; }\n\n.hologram-management-grid { display: grid; gap: 9px; }\n.hologram-management-grid > button {\n  width: 100%;\n  min-height: 64px;\n  display: grid;\n  grid-template-columns: 42px minmax(0, 1fr) 18px;\n  align-items: center;\n  gap: 10px;\n  padding: 10px 12px;\n  border: 1px solid rgba(100, 207, 249, .2);\n  border-radius: 12px;\n  color: #eaf7ff;\n  text-align: left;\n  background: linear-gradient(145deg, rgba(10, 43, 62, .72), rgba(3, 24, 38, .86));\n  cursor: pointer;\n}\n.hologram-management-grid > button:hover {\n  border-color: color-mix(in srgb, var(--scenario-accent) 72%, transparent);\n  background: color-mix(in srgb, var(--scenario-accent) 12%, rgba(3, 24, 38, .9));\n  transform: translateX(-3px);\n}\n.hologram-management-grid i { color: var(--scenario-accent); font-size: 20px; font-style: normal; text-align: center; }\n.hologram-management-grid strong,\n.hologram-management-grid small { display: block; }\n.hologram-management-grid strong { font-size: 13px; }\n.hologram-management-grid small { margin-top: 4px; color: #7f9eaf; font-size: 9px; }\n.hologram-management-grid em { color: #6d92a8; font-size: 20px; font-style: normal; text-align: right; }\n",
    'management hub styles'
)
css = css.replace('  gap: 6px;\n}\n.hologram-tool-rail button {', '  gap: 9px;\n}\n.hologram-tool-rail button {', 1)
css = css.replace('  width: 64px;\n  min-height: 48px;', '  width: 62px;\n  min-height: 52px;', 1)
css_path.write_text(css)

world_path = Path('src/presentation/pixi/ImmersivePixiWorld.ts')
world = world_path.read_text()
world = replace_once(
    world,
    "width: commercial && node.kind === 'substation' ? 154 : node.kind === 'substation' ? 142 : 92,",
    "width: commercial && node.kind === 'substation' ? 208 : node.kind === 'substation' ? 142 : 92,",
    'commercial substation scale'
)
world_path.write_text(world)

base_path = Path('public/assets/commercial/environment/dawn-city-base.svg')
base = base_path.read_text()
for old, new in {'28': '22', '22': '17', '18': '13', '19': '15', '13': '10', '11': '7.5'}.items():
    base = re.sub(r'(<path[^>]*stroke-width=")' + re.escape(old) + r'(")', r'\g<1>' + new + r'\2', base)
base = base.replace('stroke-width="1.5" stroke-linecap="round" opacity="0.36"', 'stroke-width="1.1" stroke-linecap="round" opacity="0.24"')
base = base.replace('stroke-width="0.9" stroke-linecap="round" opacity="0.16"', 'stroke-width="0.7" stroke-linecap="round" opacity="0.1"')
base_path.write_text(base)

active = '''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768" fill="none">
  <defs>
    <linearGradient id="base" x1="330" y1="430" x2="700" y2="650" gradientUnits="userSpaceOnUse"><stop stop-color="#234B47"/><stop offset="1" stop-color="#102825"/></linearGradient>
    <linearGradient id="tower" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#86C9D6"/><stop offset="1" stop-color="#315A66"/></linearGradient>
    <linearGradient id="core" x1="410" y1="390" x2="610" y2="610" gradientUnits="userSpaceOnUse"><stop stop-color="#2F8DA8"/><stop offset="1" stop-color="#113746"/></linearGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <ellipse cx="512" cy="650" rx="225" ry="54" fill="#02080A" opacity=".5" filter="url(#soft)"/>
  <ellipse cx="512" cy="548" rx="240" ry="132" fill="#4AD7FF" opacity=".08" filter="url(#glow)"/>
  <polygon points="512,430 755,552 512,674 269,552" fill="url(#base)" stroke="#4E9B92" stroke-width="3"/>
  <polygon points="512,466 650,535 512,604 374,535" fill="#10262B" stroke="#55DEFF" stroke-opacity=".42" stroke-width="3"/>
  <g transform="translate(512 480)">
    <path d="M-66 86L0 48L66 86L0 124Z" fill="#203A42" stroke="#55DEFF" stroke-width="4"/>
    <rect x="-48" y="-18" width="96" height="86" rx="12" fill="url(#core)" stroke="#72DDF4" stroke-width="4"/>
    <path d="M-58 -18L0 -54L58 -18L0 18Z" fill="#3F8295" stroke="#A7EFFF" stroke-width="4"/>
    <circle cx="0" cy="22" r="20" fill="#FFD66F" filter="url(#glow)"/>
    <circle cx="0" cy="22" r="7" fill="#FFF3B4"/>
  </g>
  <g stroke="url(#tower)" stroke-linecap="round">
    <path d="M326 528V300M698 528V300" stroke-width="14"/>
    <path d="M286 348H366M658 348H738" stroke-width="12"/>
    <path d="M304 412H348M676 412H720" stroke-width="10"/>
    <path d="M326 300L286 348M326 300L366 348M698 300L658 348M698 300L738 348" stroke-width="9"/>
  </g>
  <path d="M366 348C424 318 600 318 658 348M348 412C426 388 598 388 676 412" stroke="#D7F6FF" stroke-opacity=".7" stroke-width="5"/>
  <g transform="translate(364 556)"><ellipse cy="-42" rx="34" ry="14" fill="#87B5BE"/><rect x="-34" y="-42" width="68" height="76" rx="8" fill="#315965"/><circle cy="-5" r="10" fill="#FFD66F" filter="url(#glow)"/></g>
  <g transform="translate(660 556)"><ellipse cy="-42" rx="34" ry="14" fill="#87B5BE"/><rect x="-34" y="-42" width="68" height="76" rx="8" fill="#315965"/><circle cy="-5" r="10" fill="#FFD66F" filter="url(#glow)"/></g>
  <ellipse cx="512" cy="535" rx="210" ry="105" stroke="#55DEFF" stroke-width="5" opacity=".35" filter="url(#glow)"/>
</svg>'''
offline = active.replace('#4AD7FF', '#6E7A80').replace('#55DEFF', '#819097').replace('#72DDF4', '#89969B').replace('#A7EFFF', '#A4ADB0').replace('#FFD66F', '#6F7474').replace('#FFF3B4', '#8A8D8C').replace('#D7F6FF', '#7D878A').replace('opacity=".35"', 'opacity=".12"').replace('opacity=".08"', 'opacity=".025"')
Path('public/assets/commercial/facilities/substation/active.svg').write_text(active)
Path('public/assets/commercial/facilities/substation/offline.svg').write_text(offline)

original_workflow = '''name: Capture commercial vertical slice

on:
  pull_request:
    branches:
      - main
    paths:
      - scripts/capture-commercial-slice.mjs
      - .github/workflows/capture-commercial-slice.yml
      - public/assets/commercial/**
      - src/presentation/**
      - src/ui/MayorDashboard.ts
      - src/resources/**

permissions:
  contents: read

jobs:
  capture:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout rebuild branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install and build
        shell: bash
        run: |
          set -o pipefail
          npm install --no-audit --no-fund
          npm run build

      - name: Start production preview
        run: |
          nohup npm run preview -- --host 127.0.0.1 --port 4173 > /tmp/commercial-preview.log 2>&1 &
          for attempt in $(seq 1 60); do
            if curl --fail --silent http://127.0.0.1:4173/ > /dev/null; then
              exit 0
            fi
            sleep 0.25
          done
          cat /tmp/commercial-preview.log
          exit 1

      - name: Capture city and grid views
        env:
          APP_URL: http://127.0.0.1:4173/?renderer=immersive
          SCREENSHOT_DIR: artifacts/commercial-slice
        run: |
          CHROME_PATH="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser)"
          if [ -z "$CHROME_PATH" ]; then
            echo "No Chrome executable found"
            exit 1
          fi
          export CHROME_PATH
          node scripts/capture-commercial-slice.mjs

      - name: Upload commercial screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: commercial-vertical-slice-${{ github.sha }}
          path: artifacts/commercial-slice
          if-no-files-found: warn
          retention-days: 14
'''
Path('.github/workflows/capture-commercial-slice.yml').write_text(original_workflow)
Path('.github/workflows/apply-commercial-v10.yml').unlink(missing_ok=True)
Path('scripts/apply-commercial-v10.py').unlink()
