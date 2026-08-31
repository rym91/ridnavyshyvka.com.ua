/**
 * Спільні інструменти для побудови мотивів.
 *
 * Два способи задати мотив, і вибір між ними не смаковий:
 *
 *   правилом (grid/symmetric) — для геометрії. Симетрія виходить точною за
 *     побудовою, і мотив можна перерахувати під інший розмір, змінивши число;
 *
 *   малюнком (art + mirrorX)  — для рослинних. Лист винограду чи вигин стебла
 *     формулою не задаються: там кожна клітинка — рішення. Малюємо половину,
 *     другу дзеркалимо, щоб не розʼїхалася вісь.
 *
 * Символи: 'r' — червоний, 'k' — чорний, '.' — полотно без вишивки.
 */

/** Сітка за правилом від координат клітинки. */
export function grid(w, h, fn) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) row += fn(x, y) || '.';
    rows.push(row);
  }
  return rows;
}

/**
 * Сітка з точною 8-кратною симетрією: правило бачить лише відстані від центру
 * по модулю, тож перевернути мотив уже нічим.
 * Розмір мусить бути непарним — інакше центральної клітинки не існує і
 * «центр» доводиться підбирати на око.
 */
export function symmetric(size, fn) {
  if (size % 2 === 0) throw new Error(`symmetric(): розмір ${size} парний, центру не буде`);
  const c = (size - 1) / 2;
  return grid(size, size, (x, y) => fn(Math.abs(x - c), Math.abs(y - c)));
}

/**
 * Мотив, намальований вручну. Приймає рядки як є, але перевіряє те, що
 * найлегше зіпсувати очима: однакову довжину рядків і відсутність чужих
 * символів. Пробіл дозволяємо як синонім крапки — так малюнок читабельніший.
 */
export function art(text) {
  const rows = text.replace(/^\n/, '').replace(/\n[ \t]*$/, '').split('\n')
    .map((r) => r.replace(/ /g, '.'));
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r, i) => {
    const bad = r.match(/[^rk.]/);
    if (bad) throw new Error(`art(): рядок ${i + 1} містить «${bad[0]}»`);
    return r.padEnd(w, '.');
  });
}

/** Дзеркалимо намальовану половину вправо. keepAxis — чи належить остання колонка осі. */
export function mirrorX(rows, { keepAxis = true } = {}) {
  return rows.map((r) => {
    const tail = [...r].reverse().slice(keepAxis ? 1 : 0).join('');
    return r + tail;
  });
}

/** Дзеркалимо намальовану половину вниз. */
export function mirrorY(rows, { keepAxis = true } = {}) {
  return rows.concat(rows.slice().reverse().slice(keepAxis ? 1 : 0));
}

/** Повторюємо раппорт бордюру n разів. */
export function tile(rows, n) {
  return rows.map((r) => r.repeat(n));
}

/** Складаємо два мотиви один поверх одного: непорожня клітинка верхнього виграє. */
export function over(base, top) {
  return base.map((row, y) => [...row].map((ch, x) => {
    const t = top[y]?.[x];
    return t && t !== '.' ? t : ch;
  }).join(''));
}

/**
 * Обводка ламаної по клітинках. Для бордюрів це єдиний надійний спосіб:
 * безкінечник — це одна лінія, і намальована руками вона рветься саме там,
 * де на неї ніхто не дивиться. Відрізки мусять бути строго горизонтальні або
 * вертикальні — діагональ на канві все одно довелося б сходити сходинками.
 */
export function stroke(rows, points, ch, thickness = 1) {
  const out = rows.map((r) => [...r]);
  const put = (x, y) => {
    for (let dy = 0; dy < thickness; dy++) {
      for (let dx = 0; dx < thickness; dx++) {
        if (out[y + dy]?.[x + dx] !== undefined) out[y + dy][x + dx] = ch;
      }
    }
  };
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x0 !== x1 && y0 !== y1) throw new Error(`stroke(): відрізок ${x0},${y0}→${x1},${y1} діагональний`);
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
    for (let s = 0; s <= steps; s++) put(x0 + sx * s, y0 + sy * s);
  }
  return out.map((r) => r.join(''));
}

/** Порожня сітка потрібного розміру — основа для stroke(). */
export const blank = (w, h) => Array.from({ length: h }, () => '.'.repeat(w));

/** Ставимо шматок мотиву у сітку з зсувом. Непорожня клітинка шматка виграє. */
export function stamp(base, piece, ox, oy) {
  return base.map((row, y) => [...row].map((ch, x) => {
    const p = piece[y - oy]?.[x - ox];
    return p && p !== '.' ? p : ch;
  }).join(''));
}

/**
 * Обрізаємо порожні поля по краях. Мотив, зібраний штампами, майже завжди
 * лишає зайвий рядок або стовпець — на схемі це виглядає як зсув малюнка
 * від центру, хоча насправді просто не та сітка.
 */
export function trim(rows) {
  const has = (r) => /[^.]/.test(r);
  const top = rows.findIndex(has);
  const bottom = rows.length - 1 - [...rows].reverse().findIndex(has);
  const body = rows.slice(top, bottom + 1);
  // Порожні рядки всередині мотиву пропускаємо: у бордюра між рейкою й
  // смугою є навмисний зазор, а search() на такому рядку віддає -1 і затирає
  // межі до безглуздих.
  let left = Infinity, right = -1;
  for (const r of body) {
    if (!has(r)) continue;
    left = Math.min(left, r.search(/[^.]/));
    right = Math.max(right, r.length - 1 - [...r].reverse().join('').search(/[^.]/));
  }
  return body.map((r) => r.padEnd(right + 1, '.').slice(left, right + 1));
}

/**
 * Сходинкова гілка між двома точками. Пряма горизонтальна гілка через увесь
 * мотив читається не гілкою, а поперечиною; сходинками вона піднімається
 * назовні так, як росте справжня.
 */
export function branch(rows, [x0, y0], [x1, y1], ch) {
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  const pts = [[x0, y0]];
  let [x, y] = [x0, y0];
  while (x !== x1 || y !== y1) {
    const stepX = Math.min(Math.abs(x1 - x), 2) * dx;
    if (stepX) { x += stepX; pts.push([x, y]); }
    if (y !== y1) { y += dy; pts.push([x, y]); }
    if (!stepX && y === y1) break;
  }
  if (x !== x1) pts.push([x1, y1]);
  return stroke(rows, pts, ch);
}

/** Дзеркальне відображення без подвоєння — для парних деталей ліворуч і праворуч. */
export const flipX = (rows) => rows.map((r) => [...r].reverse().join(''));
