import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.CITY01_CAPTURE_URL ?? 'http://127.0.0.1:4173';
const outputDir = process.env.CITY01_CAPTURE_DIR ?? 'artifacts/city01-multi-viewport';
const captureRevision = 'facility-p0-layered-v1';

const cases = [
  { id: 'desktop-city', width: 1440, height: 1080, mode: 'game' },
  { id: 'desktop-placement', width: 1440, height: 1080, mode: 'game', action: 'placement' },
  { id: 'desktop-construction', width: 1440, height: 1080, mode: 'game', action: 'construction' },
  { id: 'narrow-city', width: 1024, height: 900, mode: 'game' },
  { id: 'mobile-city', width: 430, height: 932, mode: 'game' },
  { id: 'mobile-placement', width: 430, height: 932, mode: 'game', action: 'placement' },
  { id: 'mobile-grid', width: 430, height: 932, mode: 'grid' }
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;

const clickVisible = async (page, selector) => page.evaluate((targetSelector) => {
  const candidates = [...document.querySelectorAll(targetSelector)];
  const target = candidates.find((candidate) => {
    if (!(candidate instanceof HTMLElement)) return false;
    const style = getComputedStyle(candidate);
    const rect = candidate.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || 1) > 0
      && rect.width > 0
      && rect.height > 0;
  });
  if (!(target instanceof HTMLElement)) return false;
  target.click();
  return true;
}, selector);

const enterCity = async (page) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  const canvas = page.locator('canvas.city01-integrated-canvas');
  const mountedDirectly = await canvas
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!mountedDirectly) {
    const startButton = page.locator('[data-start="city-01"]');
    await startButton.waitFor({ state: 'visible', timeout: 15000 });
    await startButton.click();
    await canvas.waitFor({ state: 'visible', timeout: 30000 });
  }

  await page.waitForTimeout(350);
  const paused = await clickVisible(page, '[data-speed="0"]');
  if (!paused) throw new Error('Unable to pause the city before capture');
  await page.waitForTimeout(160);
};

const enterPlacement = async (page) => {
  let clicked = await clickVisible(page, '[data-guide-build="gas_basic"]');
  if (!clicked) {
    clicked = await clickVisible(page, '[data-build-dock-toggle="true"]');
    if (clicked) await page.waitForTimeout(100);
    clicked = await clickVisible(page, '[data-select-build="gas_basic"]');
  }
  if (!clicked) throw new Error('Unable to select gas_basic for placement');
  await page.waitForFunction(() =>
    Boolean(document.querySelector('.egt-hint-mini.placing'))
    || Boolean(document.querySelector('.hologram-secretary.placement'))
    || Boolean(document.querySelector('[data-cancel-build="true"]'))
  );
  await page.waitForTimeout(250);
};

const placeConstruction = async (page) => {
  const targets = [
    { x: 887, y: 690 },
    { x: 365, y: 470 },
    { x: 1050, y: 545 },
    { x: 698, y: 662 }
  ];

  for (const target of targets) {
    await page.mouse.click(target.x, target.y);
    await page.waitForTimeout(140);
    await page.mouse.click(target.x, target.y);
    await page.waitForTimeout(420);
    const closed = await page.evaluate(() => !document.querySelector('[data-cancel-build="true"]'));
    if (!closed) continue;
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(250);
    return;
  }

  throw new Error('Unable to confirm construction on any visible valid plot');
};

const switchToGrid = async (page) => {
  const clicked = await clickVisible(page, '[data-presentation-toggle="true"]');
  if (!clicked) throw new Error('No visible grid presentation control');
  await page.waitForFunction(() =>
    document.querySelector('[data-world-renderer="city01-integrated"]')
      ?.getAttribute('data-presentation-mode') === 'grid'
  );
};

const inspectConstructionSave = async (page) => page.evaluate(() => {
  const raw = localStorage.getItem('energy-grid-tycoon:save:v1');
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw);
    const save = envelope?.envelopeVersion === 1 && typeof envelope.payload === 'string'
      ? JSON.parse(envelope.payload)
      : envelope;
    const building = Array.isArray(save?.buildings)
      ? save.buildings.find((candidate) =>
          candidate?.configId === 'gas_basic'
          && Number(candidate?.constructionHoursRemaining ?? 0) > 0
        )
      : undefined;
    if (!building) return null;
    return {
      configId: building.configId,
      enabled: building.enabled,
      placementId: building.placementId,
      constructionHoursTotal: building.constructionHoursTotal,
      constructionHoursRemaining: building.constructionHoursRemaining
    };
  } catch {
    return null;
  }
});

const inspectPage = async (page, captureCase) => page.evaluate(({ expectedMode, expectedPlacement }) => {
  const canvas = document.querySelector('canvas.city01-integrated-canvas');
  const host = document.querySelector('[data-world-renderer="city01-integrated"]');
  const documentElement = document.documentElement;
  const body = document.body;
  const placementGuide = document.querySelector('.egt-hint-mini.placing')
    ?? document.querySelector('.hologram-secretary.placement');
  const cancelBuild = document.querySelector('[data-cancel-build="true"]');
  const placementName = placementGuide?.querySelector('b, strong')?.textContent?.trim()
    ?? document.querySelector('.release-onboarding-target')?.textContent?.trim()
    ?? null;
  const onboarding = document.querySelector('.egt-hint-mini')
    ?? document.querySelector('.release-onboarding');
  const toolRail = document.querySelector('.egt-dock')
    ?? document.querySelector('.hologram-tool-rail');
  const presentationButton = [...document.querySelectorAll('[data-presentation-toggle="true"]')]
    .find((candidate) => candidate instanceof HTMLElement && candidate.getBoundingClientRect().width > 0);
  const presentationRect = presentationButton instanceof HTMLElement
    ? presentationButton.getBoundingClientRect()
    : null;
  const topAtPresentationCenter = presentationRect
    ? document.elementFromPoint(
        presentationRect.left + presentationRect.width / 2,
        presentationRect.top + presentationRect.height / 2
      )
    : null;
  const presentationClickable = Boolean(
    presentationButton
    && topAtPresentationCenter
    && (presentationButton === topAtPresentationCenter || presentationButton.contains(topAtPresentationCenter))
  );
  const onboardingRect = onboarding instanceof HTMLElement ? onboarding.getBoundingClientRect() : null;
  const toolRailRect = toolRail instanceof HTMLElement ? toolRail.getBoundingClientRect() : null;
  const onboardingOverlapsTools = Boolean(
    onboardingRect
    && toolRailRect
    && onboardingRect.left < toolRailRect.right
    && onboardingRect.right > toolRailRect.left
    && onboardingRect.top < toolRailRect.bottom
    && onboardingRect.bottom > toolRailRect.top
  );

  const toRect = (element) => {
    if (!(element instanceof HTMLElement)) return null;
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  };

  return {
    renderer: host?.getAttribute('data-world-renderer') ?? null,
    mapArchitecture: host?.getAttribute('data-map-architecture') ?? null,
    presentationMode: host?.getAttribute('data-presentation-mode') ?? null,
    placementGuideVisible: Boolean(placementGuide || cancelBuild),
    placementName,
    expectedMode,
    expectedPlacement,
    presentationClickable,
    onboardingOverlapsTools,
    onboarding: toRect(onboarding),
    toolRail: toRect(toolRail),
    canvas: toRect(canvas),
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

const validate = (diagnostics, captureCase, constructionSave) => {
  const issues = [];
  if (diagnostics.renderer !== 'city01-integrated') issues.push('City-01 renderer did not mount');
  if (diagnostics.mapArchitecture !== 'tile-world') issues.push('City-01 did not mount the tile-world architecture');
  if (diagnostics.presentationMode !== captureCase.mode) {
    issues.push(`Expected ${captureCase.mode} mode, received ${diagnostics.presentationMode}`);
  }
  if (captureCase.action === 'placement') {
    if (!diagnostics.placementGuideVisible) issues.push('Placement guidance is not visible');
    if (!diagnostics.placementName?.includes('燃气')) {
      issues.push(`Expected gas facility placement, received ${diagnostics.placementName}`);
    }
  }
  if (captureCase.action === 'construction') {
    if (diagnostics.placementGuideVisible) issues.push('Placement mode did not close after confirmation');
    if (!constructionSave) issues.push('No unfinished gas facility was saved after construction confirmation');
    if (constructionSave?.enabled !== false) issues.push('Facility is not disabled during construction');
    if (constructionSave?.constructionHoursTotal !== 10) {
      issues.push(`Expected 10 construction hours, received ${constructionSave?.constructionHoursTotal}`);
    }
    if (!(Number(constructionSave?.constructionHoursRemaining) > 0)) {
      issues.push('Construction remaining hours were not persisted');
    }
  }
  if (captureCase.width <= 480) {
    if (!diagnostics.presentationClickable) issues.push('Mobile presentation control is visually occluded');
    if (diagnostics.onboardingOverlapsTools) issues.push('Mobile action card overlaps the tool rail');
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
    let constructionSave = null;
    const issues = [];
    try {
      await enterCity(page);
      if (captureCase.action === 'placement' || captureCase.action === 'construction') {
        await enterPlacement(page);
      }
      if (captureCase.action === 'construction') {
        await placeConstruction(page);
        constructionSave = await inspectConstructionSave(page);
      }
      if (captureCase.mode === 'grid') await switchToGrid(page);

      await page.waitForTimeout(1100);
      diagnostics = await inspectPage(page, captureCase);
      issues.push(...validate(diagnostics, captureCase, constructionSave));
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }

    await page.screenshot({
      path: `${outputDir}/${captureCase.id}.png`,
      fullPage: true
    }).catch(() => undefined);
    results.push({ ...captureCase, diagnostics, constructionSave, issues });
    if (issues.length > 0) failed = true;
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDir}/diagnostics.json`,
  `${JSON.stringify({ captureRevision, baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  'utf8'
);

for (const result of results) {
  console.log(`${result.id}: ${result.issues.length === 0 ? 'PASS' : 'FAIL'}`);
  for (const issue of result.issues) console.error(`  - ${issue}`);
}

if (failed) process.exit(1);
