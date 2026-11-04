#!/usr/bin/env node
/**
 * Перевірка внутрішніх посилань по зібраному сайту.
 *
 *   npm run build && node scripts/check-links.mjs
 *
 * Перевіряємо саме dist, а не вихідні файли. Спроба зібрати перелік сторінок
 * з src закінчилася хибною тривогою: скрипт шукав лише *.md, не бачив *.mdx —
 * і оголосив битими п'ятнадцять цілком робочих посилань. У dist сторінка або
 * є файлом, або її немає, і вгадувати нічого не треба.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('Немає dist/. Спершу зберіть сайт: npm run build');
  process.exit(2);
}

/** Усі файли в dist — і сторінки, і картинки, і PDF. */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(DIST);
const rel = (f) => '/' + path.relative(DIST, f).split(path.sep).join('/');

const served = new Set();
for (const f of files) {
  const url = rel(f);
  served.add(url);
  // /шлях/index.html обслуговується як /шлях/
  if (url.endsWith('/index.html')) served.add(url.slice(0, -'index.html'.length));
}

const pages = files.filter((f) => f.endsWith('.html'));
const broken = new Map();
let checked = 0;

for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const raw = m[1].split('#')[0].split('?')[0];
    if (!raw || raw.startsWith('//')) continue;
    checked++;
    const target = decodeURIComponent(raw);
    if (served.has(target)) continue;
    if (!broken.has(target)) broken.set(target, new Set());
    broken.get(target).add(rel(f));
  }
}

console.log(`сторінок: ${pages.length}, перевірено посилань: ${checked}`);
if (!broken.size) {
  console.log('биті посилання: немає');
  process.exit(0);
}
console.log(`биті адреси: ${broken.size}\n`);
for (const [url, from] of [...broken].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`  ${url}  (посилань: ${from.size})`);
  for (const f of [...from].slice(0, 8)) console.log(`      ← ${f}`);
}
process.exit(1);
