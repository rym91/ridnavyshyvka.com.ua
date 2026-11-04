import type { APIRoute, GetStaticPaths } from 'astro';
import { adsTxt, adsenseEnabled } from '../lib/adsense';

/**
 * /ads.txt — перелік тих, кому дозволено продавати рекламу на домені.
 *
 * Маршрут динамічний навмисне. Статичний ендпойнт, який віддає 404, у
 * збірці все одно стає файлом: на хостингу з нього вийшов би ads.txt зі
 * словом «Not found» і кодом 200. Порожній або сміттєвий ads.txt гірший за
 * відсутній — він читається як «продавати не дозволено нікому». Динамічний
 * маршрут із порожнім списком шляхів не створює файла взагалі.
 */
export const getStaticPaths: GetStaticPaths = () =>
  adsenseEnabled ? [{ params: { adsfile: 'ads.txt' } }] : [];

export const GET: APIRoute = () =>
  new Response(adsTxt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
