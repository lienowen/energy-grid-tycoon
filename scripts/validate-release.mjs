import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const errors = [];
const read = (relative) => readFile(path.join(root, relative), 'utf8');

let manifest;
try {
  manifest = JSON.parse(await read('public/manifest.webmanifest'));
} catch (error) {
  errors.push(`Manifest is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (manifest) {
  if (!manifest.name || !manifest.short_name) errors.push('Manifest must define name and short_name.');
  if (manifest.display !== 'standalone') errors.push('Manifest display must be standalone.');
  if (manifest.start_url !== '/') errors.push('Manifest start_url must be /.');
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    errors.push('Manifest must define at least one icon.');
  } else {
    for (const icon of manifest.icons) {
      if (typeof icon.src !== 'string' || !icon.src.startsWith('/')) {
        errors.push('Manifest icons must use absolute same-origin paths.');
        continue;
      }
      try {
        await access(path.join(root, 'public', icon.src.replace(/^\/+/, '')));
      } catch {
        errors.push(`Manifest icon does not exist: ${icon.src}`);
      }
    }
  }
}

const index = await read('index.html');
if (!index.includes('rel="manifest"')) errors.push('index.html does not link the web manifest.');
if (!index.includes('viewport-fit=cover')) errors.push('index.html must support safe-area viewport fitting.');
if (!index.includes('apple-mobile-web-app-capable')) errors.push('index.html is missing mobile install metadata.');

const worker = await read('public/sw.js');
for (const eventName of ['install', 'activate', 'fetch']) {
  if (!worker.includes(`addEventListener('${eventName}'`)) errors.push(`Service worker is missing ${eventName} handling.`);
}
if (!worker.includes('networkFirstNavigation')) errors.push('Service worker must provide navigation recovery.');

const main = await read('src/main.ts');
if (!main.includes("import './ui/release-polish.css'")) errors.push('Release polish stylesheet is not imported.');
if (!main.includes('RuntimeRecovery')) errors.push('Runtime recovery is not wired into startup.');
if (!main.includes("serviceWorker.register('/sw.js'")) errors.push('Service worker registration is missing.');

if (errors.length > 0) {
  console.error(`Release validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Release shell, install metadata, offline recovery, and startup wiring passed.');
}
