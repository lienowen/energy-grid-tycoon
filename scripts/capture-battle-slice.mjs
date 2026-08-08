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
const endpoint = `http://127.0.0.1:${debuggingPort}`;

await mkdir(outputDir, { recursive: true });

const chromeArgs = [
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${debuggingPort}`,
  '--window-size=1440,1080',
  '--force-device-scale-factor=1',
  `--user-data-dir=${profileDir}`,
  'about:blank'
];

let chrome;
let pageInfo;
let chromeErrors = '';
for (let launchAttempt = 1; launchAttempt <= 3 && !pageInfo; launchAttempt += 1) {
  await rm(profileDir, { recursive: true, force: true });
  chromeErrors = '';
  chrome = spawn(chromePath, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  chrome.stderr.on('data', (chunk) => { chromeErrors += chunk.toString(); });

  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (chrome.exitCode !== null) break;
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
    await sleep(600);
    console.warn(`Chrome DevTools start attempt ${launchAttempt} failed; retrying.`);
  }
}

if (!pageInfo?.webSocketDebuggerUrl) {
  throw new Error(`Chrome DevTools endpoint did not start after 3 attempts. ${chromeErrors}`);
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

const waitForExpression = async (expression, timeoutMs = 30000, label = expression) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    const defeated = await evaluate(`Boolean(document.querySelector('.battle-outcome--defeat'))`);
    if (defeated) throw new Error(`Battle ended in defeat while waiting for ${label}`);
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${label}`);
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

let mobileLayout;

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

  // Follow the intended first-minute tutorial: reroute, hit the incoming crawler, then restore the route.
  await click('[data-edge-id="battery-industrial"]');
  await click('[data-action="switch-route"]');
  await sleep(2700);
  await click('[data-edge-id="spawn-east-edge"]');
  await click('[data-action="overload"]');
  await sleep(350);
  await capture('02-overload-hit');
  await click('[data-edge-id="battery-industrial"]');
  await click('[data-action="switch-route"]');

  // Capture by game state rather than wall-clock guesses. Hosted headless Chrome may throttle RAF,
  // so these timeouts intentionally allow substantially more wall time than the in-game schedule.
  await waitForExpression(
    `document.querySelector('.battle-wave strong')?.textContent?.includes('第 2 / 3 波')`,
    60000,
    'wave two'
  );
  await sleep(1500);
  await capture('03-wave-two');

  await setViewport(390, 844, true);
  await sleep(600);
  mobileLayout = await evaluate(`(() => {
    const map = document.querySelector('.battle-map');
    const actions = document.querySelector('.battle-actions');
    const selection = document.querySelector('.battle-selection');
    const message = document.querySelector('.battle-message');
    const mapRect = map?.getBoundingClientRect();
    const actionsRect = actions?.getBoundingClientRect();
    return {
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      mapHeight: mapRect?.height ?? 0,
      mapRatio: mapRect ? mapRect.height / innerHeight : 0,
      mapBottom: mapRect?.bottom ?? 0,
      actionsBottom: actionsRect?.bottom ?? 0,
      actionBottomGap: actionsRect ? innerHeight - actionsRect.bottom : innerHeight,
      selectionVisible: Boolean(selection),
      messageVisible: Boolean(message)
    };
  })()`);
  if ((mobileLayout?.mapRatio ?? 0) < 0.5) {
    throw new Error(`Mobile battlefield is too short: ${Math.round((mobileLayout?.mapRatio ?? 0) * 100)}% of viewport`);
  }
  if ((mobileLayout?.actionBottomGap ?? 999) < -4 || (mobileLayout?.actionBottomGap ?? 999) > 140) {
    throw new Error(`Mobile command deck leaves an invalid bottom gap: ${mobileLayout?.actionBottomGap}px`);
  }
  await capture('04-mobile-wave-two');

  await setViewport(1440, 1080, false);
  await waitForExpression(
    `Boolean(document.querySelector('.battle-monster--boss'))`,
    120000,
    'boss spawn'
  );
  await sleep(700);
  await capture('05-boss-incoming');

  await waitForExpression(
    `Boolean(document.querySelector('.battle-edge-target--boss-locked'))`,
    30000,
    'boss route lock'
  );
  await sleep(250);
  await capture('06-boss-route-lock');

  const diagnostics = await evaluate(`({
    title: document.title,
    gameMode: document.documentElement.dataset.gameMode ?? '',
    waveText: document.querySelector('.battle-wave')?.textContent ?? '',
    monsterCount: document.querySelectorAll('.battle-monster').length,
    bossCount: document.querySelectorAll('.battle-monster--boss').length,
    overloadedLines: document.querySelectorAll('.battle-line--overload').length,
    bossLockedLines: document.querySelectorAll('.battle-edge-target--boss-locked').length,
    blackoutFacilities: document.querySelectorAll('[class*="blackout"]').length,
    tutorialVisible: Boolean(document.querySelector('.battle-tutorial')),
    bossHudVisible: Boolean(document.querySelector('.battle-boss-hud')),
    outcome: document.querySelector('.battle-outcome__title')?.textContent ?? '',
    viewport: { width: innerWidth, height: innerHeight }
  })`);
  diagnostics.mobileLayout = mobileLayout;
  await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
  console.log(`Captured commercial battle slice to ${outputDir}`);
} finally {
  cdp.close();
  chrome?.kill('SIGTERM');
  await sleep(250);
  await rm(profileDir, { recursive: true, force: true });
}
