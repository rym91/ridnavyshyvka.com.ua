// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// URL-ы, которые НЕ должны попадать в sitemap (служебные / noindex).
// draft-страницы не строятся вовсе (исключены в getStaticPaths), поэтому тут только статические исключения.
const SITEMAP_EXCLUDE = ['/404'];

export default defineConfig({
  site: 'https://ridnavyshyvka.com.ua',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !SITEMAP_EXCLUDE.some((p) => page.includes(p)),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
