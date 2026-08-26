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
 * Восьмикутна зірка = обʼєднання ромба й квадрата (той самий квадрат, повернутий на 45°).
 * Ромб дає чотири вістря по осях, кути квадрата — чотири по діагоналях.
 *
 * Виступ по осі дорівнює D − S, по діагоналі — (2S − D)/√2. Прирівнявши їх,
 * отримуємо D = S·√2: усі вісім променів виходять однакової довжини.
 * Обидві фігури опуклі, тож обʼєднання завжди звʼязне — «конфеті» не буває за побудовою.
 */
function inStar(dx, dy, diamond, square) {
  return Math.abs(dx) + Math.abs(dy) <= diamond || Math.max(Math.abs(dx), Math.abs(dy)) <= square;
}

/** Чорний контур по межі фігури, червона заливка, чорне ядро в центрі. */
function star8(size, square, core) {
  const diamond = Math.round(square * Math.SQRT2);
  return build(size, (dx, dy) => {
    if (!inStar(dx, dy, diamond, square)) return '.';
    const edge =
      !inStar(dx + 1, dy, diamond, square) ||
      !inStar(dx - 1, dy, diamond, square) ||
      !inStar(dx, dy + 1, diamond, square) ||
      !inStar(dx, dy - 1, diamond, square);
    if (edge) return 'k';
    if (Math.abs(dx) + Math.abs(dy) <= core) return 'k';
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
    grid: star8(25, 8, 3),
    level: 'Початковий',
    hours: '2–3 години',
  },
];
