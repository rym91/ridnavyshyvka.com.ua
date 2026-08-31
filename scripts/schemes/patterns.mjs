/**
 * Схеми для вишивки хрестиком — реєстр мотивів.
 *
 * Кожен мотив живе в окремому файлі в motifs/ разом зі своєю геометрією й
 * своїм текстом: тут лишається тільки порядок, у якому вони йдуть у наборі.
 * Порядок — від найпростішого до найскладнішого, бо це ж і порядок, у якому
 * їх беруть у роботу.
 *
 * Символи сітки: 'r' — червоний, 'k' — чорний, '.' — полотно без вишивки.
 */

/** Палітра. Номери DMC справжні — це те, з чим людина йде в магазин. */
export const PALETTE = {
  r: { dmc: '321', name: 'Червоний', hex: '#c8102e', flat: '#f6d3d9', shape: 'cross' },
  k: { dmc: '310', name: 'Чорний', hex: '#1a1714', flat: '#dedcdb', shape: 'dot' },
};

import { trim } from './lib.mjs';
import zirka from './motifs/zirka.mjs';
import romb from './motifs/romb.mjs';
import bezkinechnyk from './motifs/bezkinechnyk.mjs';
import bihunets from './motifs/bihunets.mjs';
import vynohrad from './motifs/vynohrad.mjs';
import dub from './motifs/dub.mjs';
import vazon from './motifs/vazon.mjs';

/**
 * Обрізаємо сітку по самому мотиву. Схема, у якої з одного боку зайвий
 * порожній стовпець, виглядає зсунутою — і центральні стрілки на ній
 * показують не туди, куди треба.
 */
export const PATTERNS = [bihunets, zirka, romb, bezkinechnyk, vynohrad, dub, vazon]
  .map((p) => ({ ...p, grid: trim(p.grid) }));
