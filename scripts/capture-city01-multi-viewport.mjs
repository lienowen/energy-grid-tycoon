import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.CITY01_CAPTURE_URL ?? 'http://127.0.0.1:4173';
const outputDir = process.env.CITY01_CAPTURE_DIR ?? 'artifacts/city01-multi-viewport';

const cases = [
  { id: 'desktop-city', width: 1440, height: 1080, mode: 'city' },
  { id: 'narrow-city', width: 1024, height: 900, mode: 'city' },
  { id: 'mobile-city', width: 430, height: 932, mode: 'city' },
  { id: 'mobile-grid', width: 430, height: 932, mode: 'grid' }
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;

try {
  for (const captureCase of cases) {
    const page = await browser.newPage({
      viewport: { width: captureCase.width, height: captureCase.height },
      deviceScaleFactor: 1,
      isMobile: captureCase.width <= 480,
      hasTouch: captureCase.width <= 480
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.city01-integrated-canvas', { timeout: 30000 });

    if (captureCase.mode === 'grid') {
      const gridButton = page.getByRole('button', { name: /电网/ }).first();
      await gridButton.click();
      await page.waitForFunction(() =>
        document.querySelector('[data-world-renderer="city01-integrated"]')
          ?.getAttribute('data-presentation-mode') === 'grid'
      );
    }

    await page.waitForTimeout(1200);
    const diagnostics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.city01-integrated-canvas');
      const host = document.querySelector('[data-world-renderer="city01-integrated"]');
      const canvasRect = canvas?.getBoundingClientRect();
      const documentElement = document.documentElement;
      const body = document.body;
      return {
        renderer: host?.getAttribute('data-world-renderer') ?? null,
        presentationMode: host?.getAttribute('data-presentation-mode') ?? null,
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
    });

    const issues = [];
    if (diagnostics.renderer !== 'city01-integrated') issues.push('City-01 renderer did not mount');
    if (diagnostics.presentationMode !== captureCase.mode) {
      issues.push(`Expected ${captureCase.mode} mode, received ${diagnostics.presentationMode}`);
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

    await page.screenshot({
      path: `${outputDir}/${captureCase.id}.png`,
      fullPage: true
    });
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
