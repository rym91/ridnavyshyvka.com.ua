/**
 * Малювання схеми в SVG — спільний код для PDF і для сайту.
 *
 * Жив він у render-schemes.mjs, поки схеми існували лише як PDF. Тепер ті
 * самі мотиви стоять на сторінках сайту, і друга реалізація сітки означала б
 * дві схеми одного мотиву, які рано чи пізно розійдуться в дрібниці — у
 * товщині лінії кожні десять клітинок чи в тому, де стоїть стрілка центру.
 */
import { PALETTE } from './patterns.mjs';


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
// Поле навколо сітки тримає два яруси: нумерацію і стрілки центру. Коли
// центральний стовпець сусідить із десятком (мотив завширшки 19 — центр 9,
// підпис 10), вони стоять за півклітинки один від одного, і розвести їх
// можна лише по вертикалі — звідси і поле, і виніс стрілок.
const PAD = 40;
const MAX_CELL = 20;
const MIN_CELL = 10;

/** Найбільша клітинка, що влазить у смугу набору по ширині. */
const cellByWidth = (cols) => Math.min(MAX_CELL, Math.floor((AVAIL_W - 2 * PAD) / cols));

function chartSvg(grid, { color, cell, plain = false }) {
  const cols = grid[0].length;
  const rows = grid.length;
  const pad = PAD;
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

  // Нумерація з чотирьох боків — аркуш часто наполовину закритий рукою чи
  // пʼяльцями. На вирізаному раппорті її немає разом зі стрілками: номер
  // клітинки там рахувався б від краю клаптя, а не від краю смуги.
  const num = (v, x, y, anchor) =>
    `<text x="${x}" y="${y}" font-family="Manrope,sans-serif" font-size="11" font-weight="600"
      fill="#1a1714" text-anchor="${anchor}">${v}</text>`;
  if (!plain) {
    for (let i = 10; i <= cols; i += 10) {
      out.push(num(i, pad + i * cell, pad - 9, 'middle'));
      out.push(num(i, pad + i * cell, pad + rows * cell + 17, 'middle'));
    }
    for (let i = 10; i <= rows; i += 10) {
      out.push(num(i, pad - 8, pad + i * cell + 4, 'end'));
      out.push(num(i, pad + cols * cell + 8, pad + i * cell + 4, 'start'));
    }
  }

  // Стрілки центру винесені за нумерацію, щоб не налізти на цифру.
  // На вирізаному раппорті їх немає: там центр — це центр смуги, а не цього
  // клаптя, і стрілка показувала б навмання.
  if (!plain) {
    const tri = (x, y, r) => `<path d="M0,-5 L0,5 L9,0 Z" transform="translate(${x},${y}) rotate(${r})" fill="#b3122b"/>`;
    out.push(tri(pad - 30, pad + cy * cell + cell / 2, 0));
    out.push(tri(pad + cols * cell + 30, pad + cy * cell + cell / 2, 180));
    out.push(tri(pad + cx * cell + cell / 2, pad - 30, 90));
    out.push(tri(pad + cx * cell + cell / 2, pad + rows * cell + 30, 270));
  }

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}


export { bbox, counts, symbolSvg, chartSvg, cellByWidth, AVAIL_W, PAD, MAX_CELL, MIN_CELL };

/**
 * Мініатюра мотиву: самі клітинки, без сітки, символів і підписів.
 *
 * Повна схема — це сотні ліній і значків; сім таких на одній сторінці каталогу
 * дали б кілька тисяч вузлів DOM заради картинок завбільшки з сірникову
 * коробку. У мініатюрі від схеми потрібен лише силует.
 */
export function thumbSvg(grid, cell = 4) {
  const cols = grid[0].length;
  const rows = grid.length;
  const out = [];
  grid.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      out.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${PALETTE[ch].hex}"/>`);
    }),
  );
  return `<svg viewBox="0 0 ${cols * cell} ${rows * cell}" xmlns="http://www.w3.org/2000/svg" role="presentation">${out.join('')}</svg>`;
}
