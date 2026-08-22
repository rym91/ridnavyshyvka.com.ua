#!/usr/bin/env node
/**
 * Рендер пінів для Pinterest із маніфесту scripts/pins/pins.json.
 *
 *   node scripts/pins/render-pins.mjs                 # усі піни з маніфесту
 *   node scripts/pins/render-pins.mjs --only=rushnyk  # лише ті, чий id містить підрядок
 *   node scripts/pins/render-pins.mjs --out=/tmp/x    # інша тека виводу (за замовчуванням public/pins)
 *
 * Потрібен Playwright з Chromium (у CI сайту не використовується — це офлайн-інструмент):
 *   npm i -g playwright   # браузер уже стоїть у PLAYWRIGHT_BROWSERS_PATH
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { buildHtml, W, H } from './template.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadChromium() {
  try {
    return require('playwright').chromium;
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return require(path.join(globalRoot, 'playwright')).chromium;
  }
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function dataUri(file) {
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  const ext = path.extname(abs).toLowerCase();
  return `data:${MIME[ext] || 'application/octet-stream'};base64,${fs.readFileSync(abs).toString('base64')}`;
}

/** Бере src/styles/fonts.css і вбудовує woff2 як data:-URI, щоб рендер не залежав від мережі. */
function inlineFontCss() {
  const css = fs.readFileSync(path.join(ROOT, 'src/styles/fonts.css'), 'utf8');
  const cache = new Map();
  return css.replace(/url\(\/fonts\/([^)]+)\)/g, (_, name) => {
    if (!cache.has(name)) {
      const buf = fs.readFileSync(path.join(ROOT, 'public/fonts', name));
      cache.set(name, `data:font/woff2;base64,${buf.toString('base64')}`);
    }
    return `url(${cache.get(name)})`;
  });
}

/** Максимальна висота блоку заголовка для кожної розкладки (px). */
const MAX_HEADLINE_H = { A: 268, B: 300, C: 250, D: 282 };

async function fitHeadline(page, layout) {
  await page.evaluate((maxH) => {
    const el = document.querySelector('.headline.fit');
    if (!el) return;
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.getBoundingClientRect().height > maxH && size > 34) {
      size -= 2;
      el.style.fontSize = `${size}px`;
    }
  }, MAX_HEADLINE_H[layout] ?? 268);
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v = true] = a.replace(/^--/, '').split('=');
      return [k, v];
    }),
  );

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/pins/pins.json'), 'utf8'));
  const pins = manifest.pins.filter((p) => (args.only ? p.id.includes(args.only) : true));
  if (!pins.length) {
    console.error('Немає пінів під фільтр --only=' + args.only);
    process.exit(1);
  }

  const outDir = args.out ? path.resolve(String(args.out)) : path.join(ROOT, 'public/pins');
  fs.mkdirSync(outDir, { recursive: true });

  const fontCss = inlineFontCss();
  const photos = new Map();

  const chromium = loadChromium();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  let done = 0;
  for (const pin of pins) {
    if (!photos.has(pin.photo)) photos.set(pin.photo, dataUri(pin.photo));
    const html = buildHtml({ ...pin, photoData: photos.get(pin.photo) }, fontCss);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await fitHeadline(page, pin.layout);

    const file = path.join(outDir, `pin_${pin.id}.jpg`);
    await page.screenshot({
      path: file,
      type: 'jpeg',
      quality: Number(args.quality || 84),
      clip: { x: 0, y: 0, width: W, height: H },
    });
    done += 1;
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.log(`${String(done).padStart(3)} / ${pins.length}  ${path.basename(file)}  ${kb} KB`);
  }

  await browser.close();
  console.log(`\nГотово: ${done} пінів → ${path.relative(ROOT, outDir) || outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
