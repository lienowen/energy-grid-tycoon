import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.GRID_E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDir = process.env.GRID_E2E_OUTPUT ?? 'artifacts/grid-recovery-browser';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const text = async (selector) => (await page.locator(selector).innerText()).trim();
const numberFrom = (value) => Number(value.replace(/[^0-9.-]/g, ''));
const money = async () => numberFrom(await text('.hologram-vitals > div:first-child strong'));
const lights = async () => numberFrom(await text('.hologram-vitals > div:nth-child(2) strong'));
const guideButton = () => page.locator('.hologram-secretary > button');
const edgeRow = (edgeId) => page
  .locator(`[data-grid-edge-repair="${edgeId}"], [data-grid-edge-toggle="${edgeId}"]`)
  .locator('xpath=ancestor::article');
const clickCurrent = async (selector) => page.evaluate((candidate) => {
  const element = document.querySelector(candidate);
  if (!(element instanceof HTMLElement)) throw new Error(`没有找到可点击元素：${candidate}`);
  element.click();
}, selector);

const snapshot = async (name) => {
  const direct = edgeRow('east-to-industrial');
  const tie = edgeRow('west-to-industrial-tie');
  const result = {
    name,
    money: await money(),
    lights: await lights(),
    guide: await guideButton().innerText(),
    directAction: await direct.locator('button').innerText(),
    directStatus: await direct.locator('small').innerText(),
    tieAction: await tie.locator('button').innerText(),
    tieStatus: await tie.locator('small').innerText()
  };
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
  return result;
};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-start="city-01"]').click();
  await page.locator('.grid-operations-panel').waitFor({ state: 'visible' });
  await clickCurrent('.hologram-speed [data-speed="0"]');
  await page.waitForFunction(() => document.querySelector('.hologram-speed [data-speed="0"]')?.classList.contains('active'));
  await page.waitForFunction(() => document.querySelector('.hologram-secretary > button')?.textContent?.includes('投入备用联络线'));

  const initial = await snapshot('01-initial-fault');
  assert.match(initial.guide, /投入备用联络线/);
  assert.match(initial.directAction, /抢修/);
  assert.equal(initial.tieAction, '合闸');
  assert.match(initial.tieStatus, /当前分闸/);

  await clickCurrent('.hologram-secretary > button');
  await page.waitForFunction(() => document.querySelector('.hologram-secretary > button')?.textContent?.includes('抢修主线路'));
  const transferred = await snapshot('02-tie-transfer');
  assert.match(transferred.guide, /抢修主线路/);
  assert.equal(transferred.tieAction, '分闸');
  assert.match(transferred.tieStatus, /当前负载/);
  assert.ok(numberFrom(transferred.tieStatus) > 0, `备用联络线必须承载实际负荷：${transferred.tieStatus}`);
  assert.equal(transferred.money, initial.money);
  assert.ok(transferred.lights > initial.lights, `转供后亮灯率必须上升：${initial.lights}% -> ${transferred.lights}%`);

  await clickCurrent('.hologram-secretary > button');
  await page.waitForFunction(() => document.querySelector('.hologram-secretary > button')?.textContent?.includes('断开备用联络线'));
  const repaired = await snapshot('03-main-line-repaired');
  assert.match(repaired.guide, /断开备用联络线/);
  assert.equal(repaired.directAction, '分闸');
  assert.equal(repaired.tieAction, '分闸');
  assert.equal(repaired.money, transferred.money - 320);
  assert.ok(repaired.lights >= transferred.lights, `主线抢修后亮灯率不应下降：${transferred.lights}% -> ${repaired.lights}%`);

  await clickCurrent('.hologram-secretary > button');
  await page.waitForFunction(() => document.querySelector('.hologram-secretary > button')?.textContent?.includes('建设应急电站'));
  const normalized = await snapshot('04-normal-grid-configuration');
  assert.match(normalized.guide, /建设应急电站/);
  assert.equal(normalized.directAction, '分闸');
  assert.equal(normalized.tieAction, '合闸');
  assert.match(normalized.tieStatus, /当前分闸/);
  assert.equal(normalized.money, repaired.money);

  const report = {
    baseUrl,
    passed: true,
    stages: [initial, transferred, repaired, normalized]
  };
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => undefined);
  const report = {
    baseUrl,
    passed: false,
    error: error instanceof Error ? error.stack ?? error.message : String(error)
  };
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.error(report.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
