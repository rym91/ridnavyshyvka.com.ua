#!/usr/bin/env node
/**
 * Рендер схем для вишивки хрестиком у PDF (A4, два аркуші).
 *
 *   node scripts/schemes/render-schemes.mjs                 # усі схеми
 *   node scripts/schemes/render-schemes.mjs --only=zirka    # одну
 *   node scripts/schemes/render-schemes.mjs --png           # ще й PNG для перегляду
 *
 * Аркуш 1 — оглядовий: кольорова схема, розміри, матеріали, про мотив.
 * Аркуш 2 — робочий: велика чорно-біла сітка, компактна легенда, як вишивати.
 * Дублювати одне й те саме двічі немає сенсу — другий аркуш друкують,
 * щоб працювати з ним за пʼяльцями, і кольорові плашки там лише витрачають тонер.
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
const VERSION = '1.0';

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

/** Шрифти сайту як data:-URI — PDF не залежить ні від мережі, ні від системи. */
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

/** Реальні межі мотиву: сітка може бути більшою за сам малюнок. */
function bbox(grid) {
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  grid.forEach((row, y) =>
    row.split('').forEach((ch, x) => {
      if (ch === '.') return;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }),
  );
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function counts(grid) {
  const n = {};
  grid.join('').split('').forEach((c) => c !== '.' && (n[c] = (n[c] || 0) + 1));
  return n;
}

/** Символ малюємо фігурою, а не гліфом шрифту. */
function symbolSvg(shape, color, size) {
  const m = size * 0.24;
  if (shape === 'dot') return `<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.25}" fill="${color}"/>`;
  return `<g stroke="${color}" stroke-width="${size * 0.15}" stroke-linecap="round">
    <line x1="${m}" y1="${m}" x2="${size - m}" y2="${size - m}"/>
    <line x1="${size - m}" y1="${m}" x2="${m}" y2="${size - m}"/></g>`;
}

const AVAIL_W = 703; // 186 мм смуги набору в px при 96 dpi

/**
 * Сітка схеми. Клітинку рахуємо від смуги набору, а не задаємо константою:
 * інакше схема займає чверть аркуша, поки решта стоїть порожньою.
 */
function chartSvg(grid, { color, maxCell = 20 }) {
  const cols = grid[0].length;
  const rows = grid.length;
  const pad = 28;
  const cell = Math.max(14, Math.min(maxCell, Math.floor((AVAIL_W - 2 * pad) / cols)));
  const w = cols * cell + pad * 2;
  const h = rows * cell + pad * 2;
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const out = [`<rect x="${pad}" y="${pad}" width="${cols * cell}" height="${rows * cell}" fill="#fff"/>`];

  grid.forEach((row, y) =>
    row.split('').forEach((ch, x) => {
      if (ch === '.') return;
      const p = PALETTE[ch];
      const px = pad + x * cell;
      const py = pad + y * cell;
      // плаский колір замість opacity: жодних transparency groups у PDF
      if (color) out.push(`<rect x="${px}" y="${py}" width="${cell}" height="${cell}" fill="${p.flat}"/>`);
      out.push(`<g transform="translate(${px + 1},${py + 1})">${symbolSvg(p.shape, color ? p.hex : '#1a1714', cell - 2)}</g>`);
    }),
  );

  // тонка / кожні 5 / кожні 10 — рахувати пʼятірками вдвічі легше, ніж десятками
  const line = (i, vertical) => {
    const w10 = i % 10 === 0, w5 = i % 5 === 0;
    const stroke = w10 ? '#4a4039' : w5 ? '#a89e8d' : '#cbc2b2';
    const sw = w10 ? 1.3 : w5 ? 0.9 : 0.7;
    return vertical
      ? `<line x1="${pad + i * cell}" y1="${pad}" x2="${pad + i * cell}" y2="${pad + rows * cell}" stroke="${stroke}" stroke-width="${sw}"/>`
      : `<line x1="${pad}" y1="${pad + i * cell}" x2="${pad + cols * cell}" y2="${pad + i * cell}" stroke="${stroke}" stroke-width="${sw}"/>`;
  };
  for (let i = 0; i <= cols; i++) out.push(line(i, true));
  for (let i = 0; i <= rows; i++) out.push(line(i, false));

  // повна рамка: при cols % 10 !== 0 правий і нижній край інакше лишаються волосинкою
  out.push(`<rect x="${pad}" y="${pad}" width="${cols * cell}" height="${rows * cell}"
    fill="none" stroke="#4a4039" stroke-width="1.6"/>`);

  // нумерація з чотирьох боків — аркуш часто наполовину закритий рукою чи пʼяльцями
  const num = (v, x, y, anchor) =>
    `<text x="${x}" y="${y}" font-family="Manrope,sans-serif" font-size="11" font-weight="600"
      fill="#1a1714" text-anchor="${anchor}">${v}</text>`;
  for (let i = 10; i <= cols; i += 10) {
    out.push(num(i, pad + i * cell, pad - 9, 'middle'));
    out.push(num(i, pad + i * cell, pad + rows * cell + 17, 'middle'));
  }
  for (let i = 10; i <= rows; i += 10) {
    out.push(num(i, pad - 8, pad + i * cell + 4, 'end'));
    out.push(num(i, pad + cols * cell + 8, pad + i * cell + 4, 'start'));
  }

  // стрілки центру винесені за нумерацію, щоб не налізти на цифру
  const tri = (x, y, r) => `<path d="M0,-5 L0,5 L9,0 Z" transform="translate(${x},${y}) rotate(${r})" fill="#b3122b"/>`;
  out.push(tri(pad - 22, pad + cy * cell + cell / 2, 0));
  out.push(tri(pad + cols * cell + 22, pad + cy * cell + cell / 2, 180));
  out.push(tri(pad + cx * cell + cell / 2, pad - 22, 90));
  out.push(tri(pad + cx * cell + cell / 2, pad + rows * cell + 22, 270));

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}

/** Лінійка 50 мм: страхує від друку з «підгонкою під сторінку». */
function rulerSvg() {
  const px = (50 / 25.4) * 96;
  return `<svg width="${px + 4}" height="16" viewBox="0 0 ${px + 4} 16" xmlns="http://www.w3.org/2000/svg">
    <line x1="2" y1="11" x2="${px + 2}" y2="11" stroke="#1a1714" stroke-width="1"/>
    <line x1="2" y1="4" x2="2" y2="14" stroke="#1a1714" stroke-width="1"/>
    <line x1="${px + 2}" y1="4" x2="${px + 2}" y2="14" stroke="#1a1714" stroke-width="1"/>
    ${[10, 20, 30, 40].map((mm) => {
      const x = (mm / 25.4) * 96 + 2;
      return `<line x1="${x}" y1="8" x2="${x}" y2="14" stroke="#1a1714" stroke-width="0.7"/>`;
    }).join('')}
  </svg>`;
}

/**
 * Розмір готової роботи по кожній канві. Рахуємо від реального мотиву (bbox),
 * а не від заявленого розміру сітки.
 *
 * Колонки «різати тканину» тут навмисне немає. Мотив маленький, і клапоть під
 * нього диктує не він, а пʼяльці: для аїди 14, 16 і 18 чесна відповідь та сама.
 * Три однакові числа в таблиці виглядають як помилка друку — тому це один
 * рядок під таблицею.
 */
function sizeRows(w, h) {
  return [14, 16, 18]
    .map((ct) => {
      const cw = (w / ct) * 2.54;
      const ch = (h / ct) * 2.54;
      const stitchesPerCm = (ct / 2.54).toFixed(1);
      return `<tr><td>Аїда ${ct}</td><td>${stitchesPerCm} хрестика на 1 см</td><td><b>${cw.toFixed(1)} × ${ch.toFixed(1)} см</b></td></tr>`;
    })
    .join('');
}

/** Витрата нитки: ~2.5 см нитки у два складання на один хрестик по аїді 14. */
const flossMeters = (stitches) => ((stitches * 2.5) / 100).toFixed(1);

/**
 * Легенда. Плашка кольору — тільки на кольоровому аркуші: у чорно-білій сітці
 * заливки немає, тож рожевий квадратик у легенді суперечив би самій схемі
 * (і на чорно-білому принтері однаково став би сірим, як і чорний).
 */
function legendTable(n, { color }) {
  const rows = Object.entries(PALETTE)
    .filter(([k]) => n[k])
    .map(([k, v]) => {
      const sym = `<svg width="20" height="20" viewBox="0 0 20 20">${symbolSvg(v.shape, color ? v.hex : '#1a1714', 20)}</svg>`;
      return `<tr>
        <td class="sym">${sym}</td>
        ${color ? `<td class="sw"><span class="swatch" style="background:${v.hex}"></span></td>` : ''}
        <td class="dmc">DMC ${v.dmc}</td>
        <td>${v.name}</td>
        <td class="num">${n[k]}</td>
        <td class="num">≈${flossMeters(n[k])} м</td>
      </tr>`;
    })
    .join('');
  return `<table class="legend">
    <thead><tr><th>Символ</th>${color ? '<th>Колір</th>' : ''}<th>Нитка</th><th>Назва</th>
      <th class="num">Стібків</th><th class="num">Нитки</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function sheetOne(p, b, n, total) {
  return `<section class="sheet">
  <header>
    <div class="brand">РІДНА ВИШИВКА · ridnavyshyvka.com.ua</div>
    <h1>${p.title}</h1>
    <p class="sub">${p.subtitle}</p>
  </header>

  <p class="meta"><b>${b.w} × ${b.h}</b> хрестиків <i>·</i> <b>${Object.keys(n).length}</b> кольори
    <i>·</i> <b>${total}</b> стібків <i>·</i> ${p.level} <i>·</i> ${p.hours}</p>

  <div class="chart">${chartSvg(p.grid, { color: true })}</div>
  <p class="hint">Червоні стрілки по краях позначають центр — з нього починають вишивати.
    Лінії: тонка — клітинка, середня — кожні 5, товста — кожні 10.</p>

  ${legendTable(n, { color: true })}

  <table class="sizes">
    <thead><tr><th>Канва</th><th>Щільність</th><th>Розмір готової роботи</th></tr></thead>
    <tbody>${sizeRows(b.w, b.h)}</tbody>
  </table>
  <p class="hint">Тканину ріжте <b>не менше ніж 20 × 20 см</b> — для будь-якої з цих канв. Цей запас
    потрібен не мотиву, а пʼяльцям і рамці: менший клапоть просто нема за що натягнути.</p>

  <div class="cols">
    <div class="note"><b>Що потрібно.</b> Нитка: ${p.strands}. Голка: ${p.needle}.
      Одного мотка кожного кольору вистачить із великим запасом.</div>
    <div class="note"><b>Про мотив.</b> ${p.meaning}</div>
  </div>
  <div class="note wide"><b>Звідки червоно-чорна гама.</b> ${p.dating}</div>

  ${footer(p, 1)}
</section>`;
}

function sheetTwo(p, b, n) {
  return `<section class="sheet">
  <div class="mini"><b>${p.title}</b><span>ridnavyshyvka.com.ua · робочий аркуш для друку</span></div>

  <div class="chart">${chartSvg(p.grid, { color: false })}</div>

  ${legendTable(n, { color: false })}

  <div class="cols">
    <div class="note"><b>Перед початком.</b> Обметайте край тканини або прошийте зигзагом, щоб не сипався.
      Складіть полотно вчетверо й наметайте центр контрастною ниткою — його ж показують червоні стрілки на схемі.</div>
    <div class="note"><b>Під час роботи.</b> Верхній стібок усіх хрестиків має лежати в один бік — інакше робота
      «рябить». Вузлів на вивороті не роблять: кінець нитки ховають під стібками.</div>
  </div>

  <div class="ruler">${rulerSvg()}
    <span>Друкуйте у масштабі <b>100%</b> (Actual size), без «підгонки під сторінку».
    Перевірте лінійкою: відрізок має бути рівно 50 мм.</span></div>

  ${footer(p, 2)}
</section>`;
}

const footer = (p, num) => `<footer>
  <span>Схема безкоштовна: діліться нею вільно, але не продавайте. © ridnavyshyvka.com.ua</span>
  <span>${p.title} · вер. ${VERSION} · аркуш ${num} з 2</span>
</footer>`;

function html(p) {
  const b = bbox(p.grid);
  const n = counts(p.grid);
  const total = Object.values(n).reduce((a, c) => a + c, 0);
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><style>
${fontCss()}
@page { size: A4; margin: 12mm; }
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Manrope,sans-serif;color:#1a1714;-webkit-font-smoothing:antialiased}
.sheet{page-break-after:always;display:flex;flex-direction:column;min-height:270mm}
.sheet:last-child{page-break-after:auto}
header{border-bottom:3px double #b3122b;padding-bottom:7px}
.brand{font-size:10px;font-weight:700;letter-spacing:.18em;color:#b3122b}
h1{font-family:"Playfair Display",Georgia,serif;font-size:27px;font-weight:700;margin-top:3px;line-height:1.12}
.sub{font-size:12px;color:#4a4039;margin-top:3px}
.mini{border-bottom:2px solid #b3122b;padding-bottom:5px;display:flex;justify-content:space-between;align-items:baseline}
.mini b{font-family:"Playfair Display",serif;font-size:17px}
.mini span{font-size:10px;letter-spacing:.1em;color:#b3122b;font-weight:700;text-transform:uppercase}
.meta{font-size:12px;color:#4a4039;margin:9px 0 4px;text-align:center}
.meta b{font-family:"Playfair Display",serif;font-size:14px;color:#1a1714}
.meta i{color:#b3122b;font-style:normal;margin:0 5px}
.chart{text-align:center;margin:4px 0}
.chart svg{max-width:100%;height:auto}
.hint{font-size:11px;color:#4a4039;text-align:center;margin:2px 0 10px}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:9px}
th{background:#f3ece1;text-align:left;padding:5px 7px;font-size:10px;letter-spacing:.08em;
  text-transform:uppercase;color:#4a4039;border-bottom:1px solid #4a4039}
td{padding:5px 7px;border-bottom:1px solid #e6dccd}
.sym{width:34px}.sw{width:44px}.num{text-align:right}
.legend .dmc{width:82px;font-size:14px;font-weight:700}
.swatch{display:inline-block;width:30px;height:13px;border:1px solid #4a4039;border-radius:2px;vertical-align:middle}
.cols{display:flex;gap:9px}
.note{flex:1;font-size:12px;line-height:1.45;background:#faf7f2;border-left:3px solid #b3122b;padding:8px 10px}
.note.wide{margin-top:9px}
.ruler{margin-top:auto;padding-top:10px;display:flex;align-items:center;gap:11px}
.ruler span{font-size:11px;line-height:1.4;color:#4a4039}
footer{margin-top:auto;padding-top:7px;border-top:1px solid #e6dccd;font-size:10px;color:#4a4039;
  display:flex;justify-content:space-between;gap:12px}
.ruler + footer{margin-top:9px}
</style></head><body>
${sheetOne(p, b, n, total)}
${sheetTwo(p, b, n)}
</body></html>`;
}

const chosen = PATTERNS.filter((p) => (args.only ? p.id.includes(args.only) : true));
fs.mkdirSync(OUT, { recursive: true });

const browser = await loadChromium().launch();
for (const p of chosen) {
  const b = bbox(p.grid);
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.setContent(html(p), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = path.join(OUT, `${p.id}.pdf`);
  await page.pdf({ path: pdf, format: 'A4', printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
  const pages = await page.evaluate(() => document.querySelectorAll('.sheet').length);
  console.log(`${p.id}.pdf  ${Math.round(fs.statSync(pdf).size / 1024)} KB  ${b.w}×${b.h} хрестиків  аркушів: ${pages}`);
  if (args.png) {
    for (let i = 0; i < pages; i++) {
      await page.evaluate((k) => {
        document.querySelectorAll('.sheet').forEach((s, j) => (s.style.display = j === k ? 'flex' : 'none'));
      }, i);
      await page.screenshot({ path: path.join(OUT, `${p.id}-p${i + 1}.png`), fullPage: true });
    }
  }
  await page.close();
}
await browser.close();
