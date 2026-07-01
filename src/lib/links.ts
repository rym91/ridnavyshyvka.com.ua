import type { CollectionEntry } from 'astro:content';

/** URL страницы (с trailing slash — как отдаёт хостинг): pillar → /<section>/; иначе /<section>/<slug>/. */
export function pageUrl(section: string, slug: string, pageType?: string): string {
  if (pageType === 'pillar' || slug === section) return `/${section}/`;
  return `/${section}/${slug}/`;
}

export function entryUrl(e: CollectionEntry<'pages'>): string {
  return pageUrl(e.data.section, e.data.slug, e.data.page_type);
}

/** Связанные материалы: ручные related[] (по slug) + страницы того же раздела. */
export function relatedPages(
  current: CollectionEntry<'pages'>,
  all: CollectionEntry<'pages'>[],
  limit = 6,
): CollectionEntry<'pages'>[] {
  const manual = all.filter(
    (p) => current.data.related.includes(p.data.slug) && p.data.slug !== current.data.slug,
  );
  const sameSection = all.filter(
    (p) =>
      p.data.section === current.data.section &&
      p.data.slug !== current.data.slug &&
      p.data.page_type !== 'pillar' &&
      !manual.some((m) => m.data.slug === p.data.slug),
  );
  return [...manual, ...sameSection].slice(0, limit);
}
