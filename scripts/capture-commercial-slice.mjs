import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chromePath = process.env.CHROME_PATH;
if (!chromePath) throw new Error('CHROME_PATH is required');

const outputDir = process.env.SCREENSHOT_DIR ?? 'artifacts/commercial-slice';
const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:4173/?renderer=immersive';
const debuggingPort = Number(process.env.CHROME_DEBUG_PORT ?? 9222);

await mkdir(outputDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--no-sandbox',
  `--remote-debugging-port=${debuggingPort}`,
  '--window-size=1440,1080',
  '--force-device-scale-factor=1',
  '--user-data-dir=/tmp/energy-grid-tycoon-chrome',
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeErrors = '';
chrome.stderr.on('data', (chunk) => { chromeErrors += chunk.toString(); });

const endpoint = `http://127.0.0.1:${debuggingPort}`;
let pageInfo;
for (let attempt = 0; attempt < 80; attempt += 1) {
  try {
    const response = await fetch(`${endpoint}/json/list`);
    const pages = await response.json();
    pageInfo = pages.find((item) => item.type === 'page');
    if (pageInfo?.webSocketDebuggerUrl) break;
  } catch {
    // Chrome is still starting.
  }
  await sleep(125);
}
if (!pageInfo?.webSocketDebuggerUrl) {
  chrome.kill('SIGKILL');
  throw new Error(`Chrome DevTools endpoint did not start. ${chromeErrors}`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const handlers = this.listeners.get(message.method) ?? [];
      this.listeners.delete(message.method);
      for (const handler of handlers) handler(message.params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const handlers = this.listeners.get(method) ?? [];
      handlers.push((params) => {
        clearTimeout(timer);
        resolve(params);
      });
      this.listeners.set(method, handlers);
    });
  }

  close() {
    this.socket.close();
  }
}

const cdp = new CdpClient(pageInfo.webSocketDebuggerUrl);
await cdp.connect();
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
  screenWidth: 1440,
  screenHeight: 1080
});

const evaluate = async (expression) => {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Browser evaluation failed');
  return result.result?.value;
};

const waitForSelector = async (selector, timeoutMs = 15000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const exists = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (exists) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for selector: ${selector}`);
};

const capture = async (name) => {
  await evaluate(`document.documentElement.style.overflow='hidden'; document.body.style.overflow='hidden';`);
  await sleep(500);
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(`${outputDir}/${name}.png`, Buffer.from(screenshot.data, 'base64'));
};

const loaded = cdp.waitFor('Page.loadEventFired');
await cdp.send('Page.navigate', { url: appUrl });
await loaded;
await waitForSelector('[data-start="city-01"]');
await evaluate(`document.querySelector('[data-start="city-01"]')?.click()`);
await waitForSelector('[data-hologram-canvas] canvas', 25000);
await sleep(5000);
await evaluate(`document.querySelector('[data-onboarding-skip]')?.click()`);
await sleep(900);
await capture('city-view');

await waitForSelector('[data-presentation-toggle]');
await evaluate(`document.querySelector('[data-presentation-toggle]')?.click()`);
await sleep(1200);
await capture('grid-view');

const diagnostics = await evaluate(`({
  renderer: document.querySelector('[data-hologram-canvas]')?.dataset.worldRenderer ?? '',
  presentationMode: document.querySelector('[data-hologram-canvas]')?.dataset.presentationMode ?? '',
  canvasCount: document.querySelectorAll('[data-hologram-canvas] canvas').length,
  districtLabels: [...document.querySelectorAll('canvas')].length
})`);
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));

cdp.close();
chrome.kill('SIGTERM');
await sleep(250);
console.log(`Captured commercial slice to ${outputDir}`);
