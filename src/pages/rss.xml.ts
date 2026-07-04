import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { entryUrl } from '../lib/links';

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string);

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://ridnavyshyvka.com.ua');
  const pages = (await getCollection('pages', (p) => !p.data.draft))
    .filter((p) => p.data.page_type !== 'pillar')
    .sort((a, b) => (b.data.updated?.getTime() ?? 0) - (a.data.updated?.getTime() ?? 0))
    .slice(0, 20);
  const items = pages
    .map((p) => {
      const url = new URL(entryUrl(p), base).href;
      const pub = p.data.updated ? new Date(p.data.updated).toUTCString() : '';
      return `<item><title>${esc(p.data.h1)}</title><link>${url}</link><guid>${url}</guid>${pub ? `<pubDate>${pub}</pubDate>` : ''}<description>${esc(p.data.meta_description)}</description></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Рідна вишивка — нові матеріали</title><link>${base.href}</link><description>Українська вишивка: схеми, техніки та орнаменти.</description><language>uk</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
