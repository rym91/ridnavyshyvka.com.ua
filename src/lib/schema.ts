// JSON-LD builders. Возвращают plain-объекты → рендерятся в <script type="application/ld+json">.

const SITE_NAME = 'Рідна вишивка';
// Честное бренд-авторство: материалы готовит редакция проекта (не выдуманный человек).
const EDITORIAL_NAME = 'Редакція «Рідна вишивка»';
const CONTACT_EMAIL = 'info@ridnavyshyvka.com.ua';

// siteUrl приходит как Astro.site.href → уже с завершающим слешем.
function logoObject(siteUrl: string) {
  return { '@type': 'ImageObject', url: `${siteUrl}logo.png`, width: 512, height: 512 };
}

function publisherObject(siteUrl: string) {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: logoObject(siteUrl),
  };
}

export function organizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    name: SITE_NAME,
    url: siteUrl,
    logo: logoObject(siteUrl),
    description:
      'Україномовний проєкт про народну та сучасну вишивку: схеми, техніки, орнаменти й традиції.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: CONTACT_EMAIL,
      contactType: 'editorial',
      availableLanguage: ['uk'],
    },
  };
}

export function websiteSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    inLanguage: 'uk',
    publisher: { '@id': `${siteUrl}#organization` },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}

export function articleSchema(a: ArticleSchemaInput, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.headline,
    description: a.description,
    inLanguage: 'uk',
    mainEntityOfPage: a.url,
    ...(a.image ? { image: a.image } : {}),
    ...(a.datePublished ? { datePublished: a.datePublished } : {}),
    ...(a.dateModified ? { dateModified: a.dateModified } : {}),
    author: { '@type': 'Organization', name: EDITORIAL_NAME, url: `${siteUrl}pro-nas/` },
    publisher: publisherObject(siteUrl),
  };
}

export interface CollectionPageInput {
  headline: string;
  description: string;
  url: string;
  image?: string;
  dateModified?: string;
}

// Для pillar-хабов: страница-раздел, которая агрегирует материалы (не отдельная статья).
export function collectionPageSchema(c: CollectionPageInput, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c.headline,
    description: c.description,
    url: c.url,
    inLanguage: 'uk',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: siteUrl },
    ...(c.image ? { primaryImageOfPage: c.image } : {}),
    ...(c.dateModified ? { dateModified: c.dateModified } : {}),
    publisher: publisherObject(siteUrl),
  };
}

export function faqSchema(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
