#!/usr/bin/env node
/**
 * Тимчасові hero-зображення для статей, у яких свого фото ще немає.
 *
 *   node scripts/pins/render-heroes.mjs
 *
 * Кадр беремо з того самого знімка й тієї самої області, що й на піні варіанта A,
 * але в пропорції 3:2 — щоб людина, яка прийшла з Pinterest, побачила на сторінці
 * те саме зображення, що й на піні. Це заглушки: коли зʼявляться власні фото,
 * просто покладіть їх у src/assets/heroes/<slug>.jpg і перезберіть сайт.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [W, H] = [1600, 1067];

function loadChromium() {
  try {
    return require('playwright').chromium;
  } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')).chromium;
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/pins/pins.json'), 'utf8'));

/** Кадрування під 3:2 — інша рамка, ніж у піна 2:3, тож zoom і pan свої. */
const OVERRIDES = {
  'velykodniy-rushnyk': { focus: '72% 50%', zoom: 1.15, pan: '0% 0%' },
  'rushnyk-na-hrestyny': { focus: '48% 55%', zoom: 1.05, pan: '0% 0%' },
  'borshchivska-sorochka': { focus: '50% 50%', zoom: 1.75, pan: '0% 30%' },
  'zagotovky-dlya-vyshyvky-biserom': { focus: '70% 50%', zoom: 1.1, pan: '0% 0%' },
  'tamburna-vyshyvka': { focus: '40% 50%', zoom: 1.05, pan: '0% 0%' },
};

const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png' };
const dataUri = (file) => {
  const abs = path.join(ROOT, file);
  return `data:${MIME[path.extname(abs).toLowerCase()]};base64,${fs.readFileSync(abs).toString('base64')}`;
};

async function main() {
  const targets = Object.keys(OVERRIDES).map((slug) => {
    const pin = manifest.pins.find((p) => p.slug === slug && p.variant === 'A');
    if (!pin) throw new Error(`У маніфесті немає піна ${slug}_A`);
    return { slug, photo: pin.photo, ...OVERRIDES[slug] };
  });

  const browser = await loadChromium().launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (const t of targets) {
    const [panX, panY] = t.pan.split(/\s+/);
    await page.setContent(`<!doctype html><meta charset="utf-8">
      <style>*{margin:0;padding:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:#faf7f2}
      .p{position:absolute;inset:-2px;background-image:url('${dataUri(t.photo)}');
         background-size:cover;background-position:${t.focus};
         transform:translate(${panX},${panY}) scale(${t.zoom});transform-origin:center}</style>
      <div class="p"></div>`, { waitUntil: 'load' });

    const out = path.join(ROOT, 'src/assets/heroes', `${t.slug}.jpg`);
    await page.screenshot({ path: out, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`${t.slug}.jpg  ${Math.round(fs.statSync(out).size / 1024)} KB  ← ${path.basename(t.photo)}`);
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
