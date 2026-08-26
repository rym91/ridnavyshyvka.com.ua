/**
 * Схеми для вишивки хрестиком — джерело правди.
 *
 * Сітка задається не вручну по клітинці, а правилом: так у мотиві немає
 * «конфеті» (поодиноких стібків, через які схему ненавидять вишивальниці)
 * і його легко перерахувати під інший розмір.
 *
 * Символи: 'r' — червоний, 'k' — чорний, '.' — порожньо.
 */

/** Палітра. Номери DMC справжні — це те, з чим людина йде в магазин. */
export const PALETTE = {
  r: { dmc: '321', name: 'Червоний', hex: '#c8102e', shape: 'cross' },
  k: { dmc: '310', name: 'Чорний', hex: '#1a1714', shape: 'dot' },
};

/** Прямокутник по правилу: повертає сітку size×size, заповнену функцією fn(dx, dy). */
function build(size, fn) {
  const c = (size - 1) / 2;
  const grid = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) row += fn(x - c, y - c) || '.';
    grid.push(row);
  }
  return grid;
}

/**
 * Восьмипроменева зірка через зірчастий багатокутник.
 *
 * Обʼєднання ромба й квадрата (класична «зірка Лакшмі») тут не годиться:
 * у нього западини сидять на радіусі 1.08·S при вістрях на 1.41·S, тобто
 * r/R ≈ 0.77 — око бачить восьмикутник, а не зірку. Промені з такої
 * конструкції не витягнути, це властивість самої фігури.
 *
 * Тому задаємо межу явно: 16 вершин — вісім вістер на радіусі R (через 45°)
 * і вісім западин на радіусі r (зі зсувом 22.5°). Зірка читається як зірка
 * при r/R ≈ 0.35–0.50.
 */
function starPolygon(R, r, points = 8) {
  const verts = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = i * step - Math.PI / 2;
    verts.push([rad * Math.cos(a), rad * Math.sin(a)]);
  }
  return verts;
}

function inPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Чорний контур по межі, червона заливка, всередині — ступінчастий ромб
 * негативом. Суцільне червоне поле без внутрішньої деталі виглядає
 * заливкою, а не лічильною вишивкою.
 */
function star8(size, R, r, coreOuter, coreInner) {
  const verts = starPolygon(R, r);
  const hit = (dx, dy) => inPolygon(dx, dy, verts);
  return build(size, (dx, dy) => {
    if (!hit(dx, dy)) return '.';
    const edge = !hit(dx + 1, dy) || !hit(dx - 1, dy) || !hit(dx, dy + 1) || !hit(dx, dy - 1);
    if (edge) return 'k';
    const d = Math.abs(dx) + Math.abs(dy);
    if (d === coreOuter || d === coreInner) return 'k'; // два ромби-обводи в центрі
    if (d < coreInner) return 'r';
    return 'r';
  });
}

export const PATTERNS = [
  {
    id: 'alatyr-zirka',
    title: 'Восьмикутна зірка (Алатир)',
    subtitle: 'Символ сонця й центру світу — найдавніший мотив української вишивки',
    meaning:
      'Восьмикутну зірку вишивали на грудях і плечах сорочки — там, де оберіг мав захищати найбільше. У народній традиції це знак сонця, ладу й повноти світу.',
    grid: star8(29, 13.5, 6, 7, 3),
    level: 'Початковий',
    hours: '2–3 години',
  },
];
