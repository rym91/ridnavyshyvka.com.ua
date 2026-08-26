#!/usr/bin/env node
/**
 * Рендер схем для вишивки хрестиком у PDF (A4).
 *
 *   node scripts/schemes/render-schemes.mjs                # усі схеми
 *   node scripts/schemes/render-schemes.mjs --only=alatyr  # одну
 *   node scripts/schemes/render-schemes.mjs --png          # ще й PNG для попереднього перегляду
 *
 * Кожна схема — два аркуші: кольоровий і чорно-білий символьний (для друку без кольору).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { PATTERNS, PALETTE } from './patterns.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/shemy');
// Превʼю — робочий артефакт для перегляду, у public не кладемо: воно поїде на сайт.
const PREVIEW = path.join(ROOT, 'scripts/schemes/preview');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = true] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

function loadChromium() {
  try {
    return require('playwright').chromium;
  } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')).chromium;
  }
}

/** Шрифти сайту як data:-URI — щоб PDF не залежав від мережі й від шрифтів системи. */
function fontCss() {
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

/** Символ кольору малюємо фігурою, а не гліфом — не залежить від шрифту. */
function symbolSvg(shape, color, size = 14) {
  const m = size * 0.22;
  if (shape === 'dot') {
    return `<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.26}" fill="${color}"/>`;
  }
  return `<g stroke="${color}" stroke-width="${size * 0.16}" stroke-linecap="round">
    <line x1="${m}" y1="${m}" x2="${size - m}" y2="${size - m}"/>
    <line x1="${size - m}" y1="${m}" x2="${m}" y2="${size - m}"/></g>`;
}

/** Сітка схеми: клітинки, жирні лінії кожні 10, нумерація, стрілки центру. */
function chartSvg(grid, { color }) {
  const cols = grid[0].length;
  const rows = grid.length;
  const cell = 16;
  const pad = 26;
  const w = cols * cell + pad * 2;
  const h = rows * cell + pad * 2;
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const out = [];

  out.push(`<rect x="${pad}" y="${pad}" width="${cols * cell}" height="${rows * cell}" fill="#fff"/>`);

  // заливка й символи
  grid.forEach((row, y) =>
    row.split('').forEach((ch, x) => {
      if (ch === '.') return;
      const p = PALETTE[ch];
      const px = pad + x * cell;
      const py = pad + y * cell;
      if (color) out.push(`<rect x="${px}" y="${py}" width="${cell}" height="${cell}" fill="${p.hex}" opacity="0.22"/>`);
      out.push(`<g transform="translate(${px + 1},${py + 1})">${symbolSvg(p.shape, color ? p.hex : '#1a1714', cell - 2)}</g>`);
    }),
  );

  // сітка
  for (let i = 0; i <= cols; i++) {
    const bold = i % 10 === 0;
    out.push(`<line x1="${pad + i * cell}" y1="${pad}" x2="${pad + i * cell}" y2="${pad + rows * cell}"
      stroke="${bold ? '#4a4039' : '#c9c2b7'}" stroke-width="${bold ? 1.3 : 0.5}"/>`);
  }
  for (let i = 0; i <= rows; i++) {
    const bold = i % 10 === 0;
    out.push(`<line x1="${pad}" y1="${pad + i * cell}" x2="${pad + cols * cell}" y2="${pad + i * cell}"
      stroke="${bold ? '#4a4039' : '#c9c2b7'}" stroke-width="${bold ? 1.3 : 0.5}"/>`);
  }

  // нумерація кожні 10
  const num = (v, x, y, anchor) =>
    `<text x="${x}" y="${y}" font-family="Manrope,sans-serif" font-size="9" fill="#4a4039" text-anchor="${anchor}">${v}</text>`;
  for (let i = 10; i <= cols; i += 10) out.push(num(i, pad + i * cell, pad - 7, 'middle'));
  for (let i = 10; i <= rows; i += 10) out.push(num(i, pad - 6, pad + i * cell + 3, 'end'));

  // стрілки центру з чотирьох боків
  const tri = (x, y, r) =>
    `<path d="M0,-5 L0,5 L9,0 Z" transform="translate(${x},${y}) rotate(${r})" fill="#b3122b"/>`;
  out.push(tri(pad - 13, pad + cy * cell + cell / 2, 0));
  out.push(tri(pad + cols * cell + 13, pad + cy * cell + cell / 2, 180));
  out.push(tri(pad + cx * cell + cell / 2, pad - 13, 90));
  out.push(tri(pad + cx * cell + cell / 2, pad + rows * cell + 13, 270));

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}

function counts(grid) {
  const n = {};
  grid.join('').split('').forEach((c) => c !== '.' && (n[c] = (n[c] || 0) + 1));
  return n;
}

/** Готовий розмір роботи для популярних каунтів аїди. */
function sizeTable(cols, rows) {
  return [14, 16, 18]
    .map((ct) => {
      const w = ((cols / ct) * 2.54).toFixed(1);
      const h = ((rows / ct) * 2.54).toFixed(1);
      return `<tr><td>Аїда ${ct}</td><td>${w} × ${h} см</td><td>${(+w + 10).toFixed(0)} × ${(+h + 10).toFixed(0)} см</td></tr>`;
    })
    .join('');
}

function page(p, { color }) {
  const cols = p.grid[0].length;
  const rows = p.grid.length;
  const n = counts(p.grid);
  const total = Object.values(n).reduce((a, b) => a + b, 0);

  const legend = Object.entries(PALETTE)
    .filter(([k]) => n[k])
    .map(([k, v]) => {
      const sym = `<svg width="18" height="18" viewBox="0 0 18 18">${symbolSvg(v.shape, color ? v.hex : '#1a1714', 18)}</svg>`;
      return `<tr>
        <td class="sym">${sym}</td>
        <td><span class="swatch" style="background:${v.hex}"></span></td>
        <td class="dmc">DMC ${v.dmc}</td>
        <td>${v.name}</td>
        <td class="num">${n[k]}</td>
      </tr>`;
    })
    .join('');

  return `<section class="sheet">
  <header>
    <div class="brand">РІДНА ВИШИВКА · ridnavyshyvka.com.ua</div>
    <h1>${p.title}</h1>
    <p class="sub">${p.subtitle}${color ? '' : ' · чорно-білий аркуш для друку'}</p>
  </header>

  <div class="meta">
    <div><b>${cols} × ${rows}</b><span>хрестиків</span></div>
    <div><b>${Object.keys(n).length}</b><span>кольори</span></div>
    <div><b>${total}</b><span>стібків</span></div>
    <div><b>${p.level}</b><span>рівень</span></div>
    <div><b>${p.hours}</b><span>орієнтовно</span></div>
  </div>

  <div class="chart">${chartSvg(p.grid, { color })}</div>
  <p class="hint">Червоні стрілки по краях позначають центр схеми — з нього починають вишивати.
  Жирна лінія — кожні 10 клітинок.</p>

  <table class="legend">
    <thead><tr><th>Символ</th><th>Колір</th><th>Нитка</th><th>Назва</th><th class="num">Стібків</th></tr></thead>
    <tbody>${legend}</tbody>
  </table>

  <table class="sizes">
    <thead><tr><th>Канва</th><th>Розмір роботи</th><th>Різати тканину</th></tr></thead>
    <tbody>${sizeTable(cols, rows)}</tbody>
  </table>

  <div class="note"><b>Що означає мотив.</b> ${p.meaning}</div>

  <footer>
    Схема безкоштовна — діліться з ким хочете, але не продавайте.
    Більше схем і розбір технік: <b>ridnavyshyvka.com.ua</b>
  </footer>
</section>`;
}

function html(p) {
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><style>
${fontCss()}
@page { size: A4; margin: 12mm; }
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Manrope,sans-serif;color:#1a1714;-webkit-font-smoothing:antialiased}
.sheet{page-break-after:always;display:flex;flex-direction:column;min-height:273mm}
.sheet:last-child{page-break-after:auto}
header{border-bottom:3px double #b3122b;padding-bottom:8px}
.brand{font-size:9px;font-weight:700;letter-spacing:.18em;color:#b3122b}
h1{font-family:"Playfair Display",Georgia,serif;font-size:26px;font-weight:700;margin-top:4px;line-height:1.15}
.sub{font-size:11px;color:#4a4039;margin-top:3px}
.meta{display:flex;gap:6px;margin:10px 0 6px}
.meta div{flex:1;background:#faf7f2;border:1px solid #e6dccd;border-radius:5px;padding:6px 4px;text-align:center}
.meta b{display:block;font-size:14px;font-family:"Playfair Display",serif}
.meta span{font-size:8.5px;color:#4a4039;letter-spacing:.04em}
.chart{text-align:center;margin:6px 0}
.chart svg{max-width:100%;height:auto}
.hint{font-size:9.5px;color:#4a4039;text-align:center;margin-bottom:10px}
table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:8px}
th{background:#f3ece1;text-align:left;padding:4px 6px;font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#4a4039}
td{padding:4px 6px;border-bottom:1px solid #e6dccd}
.sym{width:34px}.num{text-align:right}
.dmc{font-weight:700}
.swatch{display:inline-block;width:26px;height:12px;border:1px solid #4a4039;border-radius:2px;vertical-align:middle}
.sizes{font-size:10px}
.note{font-size:10px;line-height:1.5;background:#faf7f2;border-left:3px solid #b3122b;padding:7px 10px;margin-top:auto}
footer{margin-top:8px;padding-top:6px;border-top:1px solid #e6dccd;font-size:9px;color:#4a4039;text-align:center}
</style></head><body>
${page(p, { color: true })}
${page(p, { color: false })}
</body></html>`;
}

const chosen = PATTERNS.filter((p) => (args.only ? p.id.includes(args.only) : true));
fs.mkdirSync(OUT, { recursive: true });

const browser = await loadChromium().launch();
for (const p of chosen) {
  const page_ = await browser.newPage();
  await page_.setContent(html(p), { waitUntil: 'load' });
  await page_.evaluate(() => document.fonts.ready);
  const pdf = path.join(OUT, `${p.id}.pdf`);
  await page_.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
  console.log(`${p.id}.pdf  ${Math.round(fs.statSync(pdf).size / 1024)} KB`);
  if (args.png) {
    await page_.setViewportSize({ width: 794, height: 1123 });
    fs.mkdirSync(PREVIEW, { recursive: true });
    await page_.screenshot({ path: path.join(PREVIEW, `${p.id}.png`), fullPage: false });
  }
  await page_.close();
}
await browser.close();
