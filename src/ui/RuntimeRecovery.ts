import { SaveManager } from '../core/SaveManager';

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return '未知运行错误';
};

export class RuntimeRecovery {
  private static visible = false;

  static render(root: HTMLElement, error: unknown, saveSucceeded: boolean): void {
    if (this.visible) return;
    this.visible = true;
    console.error('Fatal runtime error:', error);

    const overlay = document.createElement('div');
    overlay.className = 'runtime-recovery';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'runtime-recovery-title');
    overlay.innerHTML = `
      <section>
        <small>城市运行保护</small>
        <h1 id="runtime-recovery-title">游戏遇到了异常</h1>
        <p>我们已经停止当前画面，避免错误继续扩大。${saveSucceeded ? '当前城市已尝试保存，可以安全重新加载。' : '本地存储不可用，重新加载后可能回到上一次自动存档。'}</p>
        <details><summary>错误信息</summary><code></code></details>
        <div>
          <button type="button" data-recovery-reload="true">重新加载并继续</button>
          <button type="button" data-recovery-reset="true">清除当前存档后重启</button>
        </div>
      </section>
    `;
    overlay.querySelector('code')!.textContent = describeError(error).slice(0, 600);
    overlay.querySelector<HTMLButtonElement>('[data-recovery-reload]')?.addEventListener('click', () => location.reload());
    overlay.querySelector<HTMLButtonElement>('[data-recovery-reset]')?.addEventListener('click', () => {
      SaveManager.clearGame();
      location.reload();
    });
    root.append(overlay);
    overlay.querySelector<HTMLButtonElement>('[data-recovery-reload]')?.focus();
  }
}
