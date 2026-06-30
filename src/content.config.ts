import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const SECTION_SLUGS = [
  'vyshyvka-hrestykom',
  'vyshyvka-biserom',
  'tehniky-vyshyvky',
  'vyshyvanka',
  'vyshyti-rushnyky',
  'materialy-dlya-vyshyvky',
  'ukrayinska-vyshyvka',
] as const;

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        section: z.enum(SECTION_SLUGS),
        page_type: z.enum(['pillar', 'category', 'article']),
        slug: z.string(),
        title: z.string().max(70),
        h1: z.string(),
        meta_description: z.string().max(170),
        primary_keyword: z.string(),
        primary_volume: z.number().int().nonnegative().optional(),
        secondary_keywords: z.array(z.string()).default([]),
        intent: z.enum(['pattern', 'howto_beginner', 'materials', 'commercial', 'info', 'general']),
        tier: z.enum(['A', 'B']),
        priority: z.enum(['P1', 'P2', 'P3']),
        hero: image().optional(),
        hero_alt: z.string().optional(),
        related: z.array(z.string()).default([]),
        faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
        updated: z.coerce.date().optional(),
        draft: z.boolean().default(false),
        noindex: z.boolean().default(false),
        product_ready: z.boolean().default(false),
      })
      .refine((d) => !d.hero || !!d.hero_alt, {
        message: 'hero_alt обовʼязковий за наявності hero',
      })
      .refine((d) => d.page_type !== 'pillar' || d.slug === d.section, {
        message: 'для pillar slug має дорівнювати section',
      }),
});

export const collections = { pages };
