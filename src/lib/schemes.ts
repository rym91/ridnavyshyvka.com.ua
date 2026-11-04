/**
 * Схеми для сайту.
 *
 * Джерело те саме, що й у PDF, — scripts/schemes/. Інакше сторінка й файл для
 * друку почали б розходитися: досить виправити мотив в одному місці й забути
 * про друге, щоб людина вишивала не те, що бачила на екрані.
 */
// Модулі схем — звичайний JS без типів: те, що з них приходить, описано
// інтерфейсами нижче, і саме вони є контрактом для сторінок.
import { PATTERNS, PALETTE } from '../../scripts/schemes/patterns.mjs';
import { bbox, counts, chartSvg, symbolSvg, thumbSvg } from '../../scripts/schemes/chart.mjs';

export interface SchemeColor {
  key: string;
  dmc: string;
  name: string;
  hex: string;
  shape: string;
  stitches: number;
  /** Приблизна витрата нитки в метрах. */
  meters: string;
  /** Значок кольору як окреме SVG — для легенди. */
  symbol: string;
}

export interface SchemeSize {
  count: number;
  density: string;
  cm: string;
}

export interface Scheme {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  hours: string;
  strands: string;
  needle: string;
  meaning: string;
  dating: string;
  /** Раппорт у хрестиках — лише в бордюрів. */
  rapport?: number;
  width: number;
  height: number;
  stitches: number;
  colors: SchemeColor[];
  sizes: SchemeSize[];
  /** Повна схема: сітка, символи, нумерація, стрілки центру. */
  chart: string;
  /** Силует мотиву для каталогу. */
  thumb: string;
  pdf: string;
  preview: string;
}

/** Витрата нитки: ~2.5 см нитки у два складання на один хрестик по аїді 14. */
const meters = (stitches: number) => ((stitches * 2.5) / 100).toFixed(1);

const sizesFor = (w: number, h: number): SchemeSize[] =>
  [14, 16, 18].map((count) => ({
    count,
    density: `${(count / 2.54).toFixed(1)} хрестика на 1 см`,
    cm: `${((w / count) * 2.54).toFixed(1)} × ${((h / count) * 2.54).toFixed(1)} см`,
  }));

export const SCHEMES: Scheme[] = PATTERNS.map((p: any) => {
  const b = bbox(p.grid);
  const n = counts(p.grid) as Record<string, number>;
  const stitches = Object.values(n).reduce((a, c) => a + c, 0);
  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    level: p.level,
    hours: p.hours,
    strands: p.strands,
    needle: p.needle,
    meaning: p.meaning,
    dating: p.dating,
    rapport: p.rapport,
    width: b.w,
    height: b.h,
    stitches,
    colors: Object.entries(PALETTE)
      .filter(([k]) => n[k])
      .map(([key, v]: [string, any]) => ({
        key,
        dmc: v.dmc,
        name: v.name,
        hex: v.hex,
        shape: v.shape,
        stitches: n[key],
        meters: meters(n[key]),
        symbol: `<svg width="22" height="22" viewBox="0 0 22 22" role="presentation">${symbolSvg(v.shape, v.hex, 22)}</svg>`,
      })),
    sizes: sizesFor(b.w, b.h),
    // 22 px на клітинку — далі SVG тягнеться по ширині колонки, бо має viewBox
    chart: chartSvg(p.grid, { color: true, cell: 22 }),
    thumb: thumbSvg(p.grid, 4),
    pdf: `/shemy/${p.id}.pdf`,
    preview: `/shemy/${p.id}-p1.png`,
  };
});

export const schemeMap: Record<string, Scheme> = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));
