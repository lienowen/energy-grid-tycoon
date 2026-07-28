import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.CITY01_CAPTURE_URL ?? 'http://127.0.0.1:4173';
const outputDir = process.env.CITY01_CAPTURE_DIR ?? 'artifacts/city01-multi-viewport';

const cases = [
  { id: 'desktop-city', width: 1440, height: 1080, mode: 'city' },
  { id: 'desktop-placement', width: 1440, height: 1080, mode: 'city', action: 'placement' },
  { id: 'narrow-city', width: 1024, height: 900, mode: 'city' },
  { id: 'mobile-city', width: 430, height: 932, mode: 'city' },
  { id: 'mobile-placement', width: 430, height: 932, mode: 'city', action: 'placement' },
  { id: 'mobile-grid', width: 430, height: 932, mode: 'grid' }
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;

const enterCity = async (page) => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const startButton = page.locator('[data-start="city-01"]');
  await startButton.waitFor({ state: 'visible', timeout: 30000 });
  await startButton.click();
  await page.waitForSelector('canvas.city01-integrated-canvas', { timeout: 30000 });
  await page.waitForTimeout(900);
};

const enterPlacement = async (page) => {
  const guideBuild = page.locator('[data-guide-build="gas_basic"]').first();
  if (await guideBuild.count()) {
    await guideBuild.click({ force: true });
  } else {
    const buildToggle = page.locator('[data-build-dock-toggle="true"]').first();
    await buildToggle.waitFor({ state: 'visible', timeout: 15000 });
    await buildToggle.click({ force: true });
    const gasButton = page.locator('[data-select-build="gas_basic"]');
    await gasButton.waitFor({ state: 'attached', timeout: 15000 });
    await gasButton.click({ force: true });
  }
  await page.waitForSelector('.hologram-secretary.placement', { timeout: 15000 });
  await page.waitForTimeout(900);
};

const inspectPage = async (page, captureCase) => page.evaluate(({ expectedMode, expectedPlacement }) => {
  const canvas = document.querySelector('canvas.city01-integrated-canvas');
  const host = document.querySelector('[data-world-renderer="city01-integrated"]');
  const canvasRect = canvas?.getBoundingClientRect();
  const documentElement = document.documentElement;
  const body = document.body;
  const placementGuide = document.querySelector('.hologram-secretary.placement');
  const placementName = placementGuide?.querySelector('strong')?.textContent?.trim() ?? null;
  return {
    renderer: host?.getAttribute('data-world-renderer') ?? null,
    presentationMode: host?.getAttribute('data-presentation-mode') ?? null,
    placementGuideVisible: Boolean(placementGuide),
    placementName,
    expectedMode,
    expectedPlacement,
    canvas: canvasRect ? {
      left: canvasRect.left,
      top: canvasRect.top,
      right: canvasRect.right,
      bottom: canvasRect.bottom,
      width: canvasRect.width,
      height: canvasRect.height
    } : null,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    scroll: {
      width: Math.max(documentElement.scrollWidth, body.scrollWidth),
      height: Math.max(documentElement.scrollHeight, body.scrollHeight),
      clientWidth: documentElement.clientWidth,
      clientHeight: documentElement.clientHeight
    }
  };
}, {
  expectedMode: captureCase.mode,
  expectedPlacement: captureCase.action === 'placement'
});

const validate = (diagnostics, captureCase) => {
  const issues = [];
  if (diagnostics.renderer !== 'city01-integrated') issues.push('City-01 renderer did not mount');
  if (diagnostics.presentationMode !== captureCase.mode) {
    issues.push(`Expected ${captureCase.mode} mode, received ${diagnostics.presentationMode}`);
  }
  if (captureCase.action === 'placement') {
    if (!diagnostics.placementGuideVisible) issues.push('Placement guidance is not visible');
    if (!diagnostics.placementName?.includes('燃气')) {
      issues.push(`Expected gas facility placement, received ${diagnostics.placementName}`);
    }
  }
  if (!diagnostics.canvas) issues.push('Canvas bounds are missing');
  if (diagnostics.scroll.width > diagnostics.scroll.clientWidth + 4) {
    issues.push(`Horizontal overflow: ${diagnostics.scroll.width} > ${diagnostics.scroll.clientWidth}`);
  }
  if (diagnostics.canvas) {
    if (diagnostics.canvas.width < captureCase.width * 0.58) {
      issues.push(`Canvas is too narrow: ${diagnostics.canvas.width}`);
    }
    if (diagnostics.canvas.height < captureCase.height * 0.46) {
      issues.push(`Canvas is too short: ${diagnostics.canvas.height}`);
    }
    if (diagnostics.canvas.right < 0 || diagnostics.canvas.left > captureCase.width) {
      issues.push('Canvas is outside the horizontal viewport');
    }
    if (diagnostics.canvas.bottom < 0 || diagnostics.canvas.top > captureCase.height) {
      issues.push('Canvas is outside the vertical viewport');
    }
  }
  return issues;
};

try {
  for (const captureCase of cases) {
    const page = await browser.newPage({
      viewport: { width: captureCase.width, height: captureCase.height },
      deviceScaleFactor: 1,
      isMobile: captureCase.width <= 480,
      hasTouch: captureCase.width <= 480
    });

    let diagnostics = null;
    const issues = [];
    try {
      await enterCity(page);
      if (captureCase.action === 'placement') await enterPlacement(page);

      if (captureCase.mode === 'grid') {
        const gridButton = page.getByRole('button', { name: /电网/ }).first();
        await gridButton.waitFor({ state: 'visible', timeout: 15000 });
        await gridButton.click({ force: true });
        await page.waitForFunction(() =>
          document.querySelector('[data-world-renderer="city01-integrated"]')
            ?.getAttribute('data-presentation-mode') === 'grid'
        );
      }

      await page.waitForTimeout(900);
      diagnostics = await inspectPage(page, captureCase);
      issues.push(...validate(diagnostics, captureCase));
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }

    await page.screenshot({
      path: `${outputDir}/${captureCase.id}.png`,
      fullPage: true
    }).catch(() => undefined);
    results.push({ ...captureCase, diagnostics, issues });
    if (issues.length > 0) failed = true;
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDir}/diagnostics.json`,
  `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  'utf8'
);

for (const result of results) {
  console.log(`${result.id}: ${result.issues.length === 0 ? 'PASS' : 'FAIL'}`);
  for (const issue of result.issues) console.error(`  - ${issue}`);
}

if (failed) process.exit(1);
