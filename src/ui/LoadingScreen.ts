const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export class LoadingScreen {
  static render(root: HTMLElement, title: string, detail: string): void {
    root.innerHTML = `
      <main class="loading-shell" role="status" aria-live="polite">
        <div class="loading-card">
          <div class="loading-mark" aria-hidden="true"><i></i><i></i><i></i></div>
          <span class="eyebrow">ENERGY GRID TYCOON</span>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(detail)}</p>
        </div>
      </main>
    `;
  }

  static renderError(root: HTMLElement, error: unknown): void {
    const message = error instanceof Error ? error.message : '未知启动错误';
    root.innerHTML = `
      <main class="loading-shell error-shell" role="alert">
        <div class="loading-card">
          <span class="eyebrow">BOOT FAILURE</span>
          <h1>游戏启动失败</h1>
          <p>${escapeHtml(message)}</p>
          <button data-reload>重新加载</button>
        </div>
      </main>
    `;
    root.querySelector<HTMLButtonElement>('[data-reload]')
      ?.addEventListener('click', () => window.location.reload());
  }
}
