#!/usr/bin/env node
/**
 * Перевірка мотивів. Те, що на схемі помічає вишивальниця, а не автор:
 *
 *   конфеті   — поодинокі стібки без жодного сусіда навіть по діагоналі.
 *               Найчастіша причина, чому схему кидають недовишитою;
 *   симетрія  — які саме дзеркала й повороти справді тримаються. Мотив, що
 *               «майже симетричний», виглядає як помилка, а не як задум;
 *   острівці  — скільки незвʼязних плям у кожного кольору. Багато дрібних
 *               плям = багато перезаправок голки;
 *   розмір    — реальний bbox, а не заявлена сітка, і сантиметри на аїді 14.
 *
 *   node scripts/schemes/verify.mjs            # усі
 *   node scripts/schemes/verify.mjs --art=id   # ще й показати мотив блоками
 */
import { PATTERNS } from './patterns.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v = true] = a.replace(/^--/, '').split('=');
  return [k, v];
}));

const cellsOf = (g) => {
  const out = [];
  g.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && out.push({ x, y, ch })));
  return out;
};

function confetti(cells) {
  const set = new Set(cells.map((c) => `${c.x},${c.y}`));
  return cells.filter(({ x, y }) => {
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        if ((a || b) && set.has(`${x + a},${y + b}`)) return false;
      }
    }
    return true;
  });
}

function islands(cells, ch) {
  const left = new Set(cells.filter((c) => c.ch === ch).map((c) => `${c.x},${c.y}`));
  let n = 0;
  while (left.size) {
    n++;
    const stack = [left.values().next().value];
    left.delete(stack[0]);
    while (stack.length) {
      const [x, y] = stack.pop().split(',').map(Number);
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const key = `${x + a},${y + b}`;
          if (left.has(key)) { left.delete(key); stack.push(key); }
        }
      }
    }
  }
  return n;
}

/** Які перетворення лишають мотив тим самим. Для несиметричних — просто «—». */
function symmetries(g) {
  const h = g.length, w = g[0].length;
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? g[y][x] : null);
  const holds = (f) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [nx, ny] = f(x, y);
      if (at(nx, ny) !== g[y][x]) return false;
    }
    return true;
  };
  const found = [];
  if (holds((x, y) => [w - 1 - x, y])) found.push('↔');
  if (holds((x, y) => [x, h - 1 - y])) found.push('↕');
  if (w === h) {
    if (holds((x, y) => [y, x])) found.push('╲');
    if (holds((x, y) => [h - 1 - y, w - 1 - x])) found.push('╱');
    if (holds((x, y) => [h - 1 - y, x])) found.push('↻90°');
  }
  return found.length ? found.join(' ') : '—';
}

function bbox(cells) {
  const xs = cells.map((c) => c.x), ys = cells.map((c) => c.y);
  return { w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
}

let bad = 0;
for (const p of PATTERNS) {
  const g = p.grid;
  const widths = new Set(g.map((r) => r.length));
  const cells = cellsOf(g);
  const conf = confetti(cells);
  const b = bbox(cells);
  const n = {};
  cells.forEach((c) => (n[c.ch] = (n[c.ch] || 0) + 1));
  const isles = Object.keys(n).map((ch) => `${ch}:${islands(cells, ch)}`).join(' ');
  const problems = [];
  if (widths.size !== 1) problems.push(`рядки різної довжини: ${[...widths].join(', ')}`);
  if (conf.length) problems.push(`конфеті ${conf.length} (${conf.slice(0, 4).map((c) => `${c.x},${c.y}`).join(' ')})`);
  if (problems.length) bad++;

  console.log(`\n${problems.length ? '✗' : '✓'} ${p.id} — ${p.title}`);
  console.log(`   ${b.w}×${b.h} хрестиків · ${(b.w / 14 * 2.54).toFixed(1)}×${(b.h / 14 * 2.54).toFixed(1)} см на аїді 14`);
  console.log(`   стібків ${cells.length} ${JSON.stringify(n)} · острівці ${isles} · симетрія ${symmetries(g)}`);
  problems.forEach((m) => console.log(`   ! ${m}`));
  if (args.art === true || args.art === p.id) {
    console.log(g.map((r) => r.replace(/k/g, '██').replace(/r/g, '▒▒').replace(/\./g, '  ')).join('\n'));
  }
}
console.log(`\n${PATTERNS.length} мотивів, з проблемами: ${bad}`);
process.exit(bad ? 1 : 0);
