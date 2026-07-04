import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { entryUrl } from '../lib/links';
import { getSection } from '../lib/sections';

// Статичний JSON-індекс для клієнтського пошуку (/poshuk/). Без зовнішніх залежностей.
export const GET: APIRoute = async () => {
  const pages = await getCollection('pages', (p) => !p.data.draft);
  const items = pages.map((p) => ({
    title: p.data.h1,
    url: entryUrl(p),
    section: getSection(p.data.section)?.title ?? '',
    description: p.data.meta_description,
    keywords: [p.data.primary_keyword, ...p.data.secondary_keywords].join(' '),
  }));
  items.push(
    {
      title: 'Калькулятор розміру вишивки',
      url: '/kalkulyator-rozmiru-vyshyvky/',
      section: 'Інструменти',
      description: 'Порахуйте розмір вишивки у сантиметрах за каунтом канви.',
      keywords: 'калькулятор розмір вишивки канва каунт см',
    },
    {
      title: 'Тетяна Римарьова — авторка',
      url: '/avtorka/',
      section: 'Про сайт',
      description: 'Майстриня-рукодільниця, авторка матеріалів сайту.',
      keywords: 'авторка тетяна римарьова майстриня',
    },
  );
  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
