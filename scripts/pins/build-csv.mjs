#!/usr/bin/env node
/**
 * Готує файли імпорту в Pinterest із маніфесту scripts/pins/pins.json.
 *
 *   node scripts/pins/build-csv.mjs
 *   node scripts/pins/build-csv.mjs --start=2026-09-01 --per-day=8   # проставити дати публікації
 *   node scripts/pins/build-csv.mjs --start=... --first-slot=12:00  # перший день починається пізніше
 *   node scripts/pins/build-csv.mjs --flatten                        # без переносів рядків в описах
 *   node scripts/pins/build-csv.mjs --order=manifest                 # без перетасовки порядку
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
 * Порядок публікації. У маніфесті піни лежать групами по сторінці,
 * тож без перетасовки в один день пішло б три піни на той самий URL — для Pinterest це спам.
 *
 * Розкладаємо так:
 *  1) групуємо піни за посиланням і шикуємо групи по колу через розділи,
 *     щоб сусідні піни йшли на різні дошки;
 *  2) сторінки з кількома варіантами розкидаємо по третинах стрічки з кроком —
 *     A, B і C одного URL розходяться на кілька днів і не забивають день однією дошкою;
 *  3) вільні слоти заповнюємо сторінками, у яких варіант один.
 */
function spreadOrder(pins) {
  const byLink = new Map();
  for (const p of pins) {
    if (!byLink.has(p.link)) byLink.set(p.link, []);
    byLink.get(p.link).push(p);
  }

  const lanes = new Map();
  for (const group of byLink.values()) {
    const key = group[0].section;
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key).push(group);
  }

  const queue = [];
  const laneList = [...lanes.values()];
  const deepest = Math.max(...laneList.map((l) => l.length));
  for (let i = 0; i < deepest; i++) {
    for (const lane of laneList) if (lane[i]) queue.push(lane[i]);
  }

  const total = pins.length;
  const rounds = Math.max(...queue.map((g) => g.length));
  const multi = queue.filter((g) => g.length > 1);
  const singles = queue.filter((g) => g.length === 1).map((g) => g[0]);
  const slots = new Array(total).fill(null);

  const freeFrom = (from) => {
    for (let i = 0; i < total; i++) {
      const at = (from + i) % total;
      if (!slots[at]) return at;
    }
    throw new Error('Немає вільних слотів');
  };

  // Крок між сторінками з кількома варіантами — щоб вони не йшли підряд
  // і не забивали один день однією дошкою.
  const stride = Math.max(1, Math.floor(total / rounds / Math.max(1, multi.length)));

  for (let round = 0; round < rounds; round++) {
    const base = Math.round((round * total) / rounds);
    multi.forEach((group, k) => {
      if (!group[round]) return;
      const at = freeFrom(base + k * stride);
      slots[at] = group[round];
    });
  }

  let next = 0;
  for (let i = 0; i < total; i++) if (!slots[i]) slots[i] = singles[next++];
  return slots;
}

/** Робоче вікно доби для публікацій. */
const DAY_WINDOW = [8 * 60, 20 * 60];

function parseHm(value, label) {
  if (!value || value === true) return null;
  const m = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Некоректний час ${label}=${value}, треба ГГ:ХХ`);
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (minutes >= DAY_WINDOW[1]) throw new Error(`${label}=${value} — не раніше за кінець вікна публікацій`);
  return minutes;
}

/** Слоти рівномірно розкидані по вікну: крок рахуємо у хвилинах і округлюємо до 5. */
function slotTime(slot, perDay, from) {
  const to = DAY_WINDOW[1];
  const raw = perDay === 1 ? (from + to) / 2 : from + (slot * (to - from)) / (perDay - 1);
  const minutes = Math.round(raw / 5) * 5;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Дати публікації: Pinterest планує максимум на 30 днів уперед,
 * тому за замовчуванням колонка порожня — піни підуть одразу.
 */
function schedule(count) {
  if (!args.start) return () => '';
  const perDay = Math.max(1, Number(args['per-day'] || 2));
  const start = new Date(`${args.start}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) throw new Error(`Некоректна дата --start=${args.start}`);
  const days = Math.ceil(count / perDay);
  if (days > 30) {
    console.warn(`⚠ ${count} пінів по ${perDay}/день — це ${days} днів, а Pinterest планує максимум на 30.`);
  }
  // У перший день піни не мають ставати в минуле — початок вікна можна відсунути.
  const firstSlot = parseHm(args['first-slot'], '--first-slot');

  return (i) => {
    const day = Math.floor(i / perDay);
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + day);
    const from = day === 0 && firstSlot !== null ? Math.max(firstSlot, DAY_WINDOW[0]) : DAY_WINDOW[0];
    return `${d.toISOString().slice(0, 10)} ${slotTime(i % perDay, perDay, from)}`;
  };
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/pins/pins.json'), 'utf8'));
let pins = manifest.pins;
if (args.order !== 'manifest') pins = spreadOrder(pins);

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
console.log(`Порядок: ${args.order === 'manifest' ? 'як у маніфесті' : 'рознесений (один URL не повторюється підряд)'}`);
console.log(`Дати публікації: ${args.start ? `з ${args.start}, по ${args['per-day'] || 2}/день` : 'порожні (публікація одразу)'}`);
if (args.start) {
  const perDay = Math.max(1, Number(args['per-day'] || 2));
  const dayOne = pins.slice(0, perDay).map((_, i) => at(i).slice(11)).join(', ');
  console.log(`Перший день: ${dayOne}`);
}
console.log(`\n→ ${path.relative(ROOT, path.join(OUT_DIR, 'pinterest-bulk.csv'))}`);
console.log(`→ ${path.relative(ROOT, path.join(OUT_DIR, 'pins-make.csv'))}`);
