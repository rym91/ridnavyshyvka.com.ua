#!/usr/bin/env node
/**
 * Готує файли імпорту в Pinterest із маніфесту scripts/pins/pins.json.
 *
 *   node scripts/pins/build-csv.mjs
 *   node scripts/pins/build-csv.mjs --start=2026-09-01 --per-day=3   # проставити дати публікації
 *   node scripts/pins/build-csv.mjs --flatten                        # без переносів рядків в описах
 *   node scripts/pins/build-csv.mjs --new-only                       # лише піни цієї партії
 *
 * На виході (scripts/pins/export/):
 *   pinterest-bulk.csv — рівно ті 8 колонок, що очікує масове завантаження Pinterest
 *   pins-make.csv      — усі поля, включно з alt_text, для сценарію Make / Pinterest API
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'scripts/pins/export');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = true] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

/** RFC 4180: лапки подвоюємо, поле беремо в лапки, якщо є кома, лапки або перенос рядка. */
function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/**
 * Дати публікації: Pinterest планує максимум на 30 днів уперед,
 * тому за замовчуванням колонка порожня — піни підуть одразу.
 */
function schedule(count) {
  if (!args.start) return () => '';
  const perDay = Math.max(1, Number(args['per-day'] || 2));
  const hours = [9, 13, 17, 20, 11, 15];
  const start = new Date(`${args.start}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) throw new Error(`Некоректна дата --start=${args.start}`);
  const days = Math.ceil(count / perDay);
  if (days > 30) {
    console.warn(`⚠ ${count} пінів по ${perDay}/день — це ${days} днів, а Pinterest планує максимум на 30.`);
  }
  return (i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + Math.floor(i / perDay));
    const hh = String(hours[i % perDay] ?? 12).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${hh}:00`;
  };
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/pins/pins.json'), 'utf8'));
let pins = manifest.pins;
if (args['new-only']) {
  const cutoff = new Set(pins.map((p) => p.id));
  pins = pins.filter((p) => cutoff.has(p.id));
}

const text = (s) => (args.flatten ? String(s).replace(/\s*\n+\s*/g, ' ').trim() : s);
const at = schedule(pins.length);

fs.mkdirSync(OUT_DIR, { recursive: true });

// 1. Формат масового завантаження Pinterest — колонки й порядок міняти не можна.
const bulk = toCsv(
  ['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'],
  pins.map((p, i) => [p.title, p.image_url, p.board, '', text(p.description), p.link, at(i), p.keywords]),
);
fs.writeFileSync(path.join(OUT_DIR, 'pinterest-bulk.csv'), bulk);

// 2. Повний набір полів для Make / Pinterest API (тут є alt_text, якого немає в bulk-CSV).
const make = toCsv(
  ['id', 'slug', 'variant', 'section', 'board', 'title', 'description', 'alt_text', 'link', 'image_url', 'keywords', 'publish_date'],
  pins.map((p, i) => [
    p.id, p.slug, p.variant, p.section, p.board,
    p.title, text(p.description), p.alt_text, p.link, p.image_url, p.keywords, at(i),
  ]),
);
fs.writeFileSync(path.join(OUT_DIR, 'pins-make.csv'), make);

const longest = pins.reduce((a, p) => Math.max(a, p.title.length), 0);
console.log(`Рядків: ${pins.length}`);
console.log(`Дошок: ${new Set(pins.map((p) => p.board)).size}, URL-адрес: ${new Set(pins.map((p) => p.link)).size}`);
console.log(`Найдовший title: ${longest} символів (ліміт 100)`);
console.log(`Дати публікації: ${args.start ? `з ${args.start}, по ${args['per-day'] || 2}/день` : 'порожні (публікація одразу)'}`);
console.log(`\n→ ${path.relative(ROOT, path.join(OUT_DIR, 'pinterest-bulk.csv'))}`);
console.log(`→ ${path.relative(ROOT, path.join(OUT_DIR, 'pins-make.csv'))}`);
