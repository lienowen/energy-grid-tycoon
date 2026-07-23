const GAME_SELECTOR = '.hologram-game';
const STAGE_SELECTOR = '.hologram-stage';
const CONTROLS_ATTRIBUTE = 'data-floating-build-controls';

const setBuildDrawerOpen = (game: HTMLElement, open: boolean): void => {
  game.classList.toggle('build-drawer-open', open);
  const toggle = game.querySelector<HTMLButtonElement>('[data-floating-build-toggle]');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.dataset.state = open ? 'open' : 'closed';
  toggle.innerHTML = open
    ? '<span aria-hidden="true">×</span><strong>收起</strong>'
    : '<span aria-hidden="true">⌂</span><strong>建设</strong>';
};

const ensureBuildDockCloseButton = (game: HTMLElement): void => {
  const dock = game.querySelector<HTMLElement>('.hologram-build-dock');
  if (!dock || dock.querySelector('[data-build-drawer-close]')) return;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'build-drawer-close';
  close.dataset.buildDrawerClose = 'true';
  close.setAttribute('aria-label', '收起建设栏');
  close.textContent = '×';
  dock.appendChild(close);
};

const ensureMounted = (): void => {
  const game = document.querySelector<HTMLElement>(GAME_SELECTOR);
  const stage = game?.querySelector<HTMLElement>(STAGE_SELECTOR);
  if (!game || !stage) return;

  game.classList.add('fullscreen-hud-enabled');
  if (!stage.querySelector(`[${CONTROLS_ATTRIBUTE}]`)) {
    const controls = document.createElement('div');
    controls.className = 'floating-build-controls';
    controls.setAttribute(CONTROLS_ATTRIBUTE, 'true');
    controls.innerHTML = `
      <button
        type="button"
        class="floating-build-fab"
        data-floating-build-toggle="true"
        data-state="closed"
        aria-expanded="false"
        aria-controls="city-build-drawer"
      ><span aria-hidden="true">⌂</span><strong>建设</strong></button>
    `;
    stage.appendChild(controls);
  }

  const dock = game.querySelector<HTMLElement>('.hologram-build-dock');
  if (dock) dock.id = 'city-build-drawer';
  ensureBuildDockCloseButton(game);

  if (game.querySelector('.hologram-secretary.placement')) {
    setBuildDrawerOpen(game, false);
  }
};

const onDocumentClick = (event: MouseEvent): void => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const game = target.closest<HTMLElement>(GAME_SELECTOR) ?? document.querySelector<HTMLElement>(GAME_SELECTOR);
  if (!game) return;

  if (target.closest('[data-floating-build-toggle]')) {
    setBuildDrawerOpen(game, !game.classList.contains('build-drawer-open'));
    return;
  }
  if (target.closest('[data-build-drawer-close]')) {
    setBuildDrawerOpen(game, false);
    return;
  }
  if (target.closest('[data-select-build], [data-panel], [data-guide-panel]')) {
    window.setTimeout(() => setBuildDrawerOpen(game, false), 0);
  }
};

const observer = new MutationObserver(() => ensureMounted());
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('click', onDocumentClick);
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const game = document.querySelector<HTMLElement>(GAME_SELECTOR);
  if (game) setBuildDrawerOpen(game, false);
});

ensureMounted();
