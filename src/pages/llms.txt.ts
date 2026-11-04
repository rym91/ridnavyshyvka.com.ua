import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { entryUrl } from '../lib/links';
import { SECTIONS } from '../lib/sections';

// llms.txt (llmstxt.org) — карта сайту в Markdown для AI / answer engines.
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://ridnavyshyvka.com.ua')).href.replace(/\/$/, '');
  const pages = await getCollection('pages', (p) => !p.data.draft);

  let out = `# Рідна вишивка\n\n`;
  out +=
    `> Україномовний ресурс про народну та сучасну вишивку: схеми, техніки, орнаменти й матеріали. ` +
    `Практичні гайди простою мовою — від першого хрестика до регіональних орнаментів. ` +
    `Автор матеріалів — Тетяна Римарьова, майстриня-рукодільниця з Києва.\n\n`;

  for (const s of SECTIONS) {
    const inSec = pages.filter((p) => p.data.section === s.slug);
    if (!inSec.length) continue;
    out += `## ${s.title}\n`;
    const pillar = inSec.find((p) => p.data.page_type === 'pillar');
    if (pillar) out += `- [${pillar.data.h1}](${base}${entryUrl(pillar)}): ${pillar.data.meta_description}\n`;
    for (const p of inSec
      .filter((p) => p.data.page_type !== 'pillar')
      .sort((a, b) => a.data.h1.localeCompare(b.data.h1, 'uk'))) {
      out += `- [${p.data.h1}](${base}${entryUrl(p)}): ${p.data.meta_description}\n`;
    }
    out += `\n`;
  }

  out += `## Інструменти й довідка\n`;
  out += `- [Калькулятор розміру вишивки](${base}/kalkulyator-rozmiru-vyshyvky/): розмір вишивки у сантиметрах за кількістю хрестиків і каунтом канви.\n`;
  out += `- [Словник термінів вишивки](${base}/slovnyk-vyshyvky/): основні поняття вишивки простими словами.\n`;
  out += `- [Про авторку](${base}/avtorka/): Тетяна Римарьова — майстриня-рукодільниця з Києва.\n`;

  return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
