import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chromePath = process.env.CHROME_PATH;
if (!chromePath) throw new Error('CHROME_PATH is required');

const outputDir = process.env.SCREENSHOT_DIR ?? 'artifacts/battle-slice';
const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:4173/';
const debuggingPort = Number(process.env.CHROME_DEBUG_PORT ?? 9333);
const profileDir = path.join(os.tmpdir(), `energy-grid-battle-chrome-${process.pid}`);

await mkdir(outputDir, { recursive: true });
await rm(profileDir, { recursive: true, force: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--no-sandbox',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  `--remote-debugging-port=${debuggingPort}`,
  '--window-size=1440,1080',
  '--force-device-scale-factor=1',
  `--user-data-dir=${profileDir}`,
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeErrors = '';
chrome.stderr.on('data', (chunk) => { chromeErrors += chunk.toString(); });

const endpoint = `http://127.0.0.1:${debuggingPort}`;
let pageInfo;
for (let attempt = 0; attempt < 120; attempt += 1) {
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

  waitFor(method, timeoutMs = 15000) {
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

const setViewport = async (width, height, mobile = false) => {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
};

await setViewport(1440, 1080, false);

const evaluate = async (expression) => {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Browser evaluation failed');
  return result.result?.value;
};

const waitForSelector = async (selector, timeoutMs = 20000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const exists = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (exists) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for selector: ${selector}`);
};

const click = async (selector) => {
  const clicked = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not click selector: ${selector}`);
};

const capture = async (name) => {
  await evaluate(`document.documentElement.style.overflow='hidden'; document.body.style.overflow='hidden';`);
  await sleep(180);
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(`${outputDir}/${name}.png`, Buffer.from(screenshot.data, 'base64'));
};

try {
  const loaded = cdp.waitFor('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: appUrl });
  await loaded;
  await waitForSelector('.battle-shell');
  await waitForSelector('[data-action="start-battle"]');
  await sleep(700);
  await capture('00-mission-briefing');

  await click('[data-action="start-battle"]');
  await sleep(500);
  await capture('01-first-wave-tutorial');

  // Follow the intended first-minute commercial tutorial: reroute first, then overload the incoming crawler.
  await click('[data-edge-id="battery-industrial"]');
  await click('[data-action="switch-route"]');
  await sleep(2700);
  await click('[data-edge-id="spawn-east-edge"]');
  await click('[data-action="overload"]');
  await sleep(180);
  await capture('02-overload-hit');

  // Mid-battle: second wave, multiple routes and monster types visible.
  await sleep(24000);
  await capture('03-wave-two');

  await setViewport(390, 844, true);
  await sleep(500);
  await capture('04-mobile-wave-two');

  // Return to desktop and wait until the boss is actually rendered, not merely scheduled.
  await setViewport(1440, 1080, false);
  await sleep(44500);
  await waitForSelector('.battle-monster--boss', 30000);
  await sleep(500);
  await capture('05-boss-incoming');

  const diagnostics = await evaluate(`({
    title: document.title,
    gameMode: document.documentElement.dataset.gameMode ?? '',
    monsterCount: document.querySelectorAll('.battle-monster').length,
    bossCount: document.querySelectorAll('.battle-monster--boss').length,
    overloadedLines: document.querySelectorAll('.battle-line--overload').length,
    blackoutFacilities: document.querySelectorAll('[class*="blackout"]').length,
    tutorialVisible: Boolean(document.querySelector('.battle-tutorial')),
    bossHudVisible: Boolean(document.querySelector('.battle-boss-hud')),
    viewport: { width: innerWidth, height: innerHeight }
  })`);
  await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
  console.log(`Captured commercial battle slice to ${outputDir}`);
} finally {
  cdp.close();
  chrome.kill('SIGTERM');
  await sleep(250);
  await rm(profileDir, { recursive: true, force: true });
}
