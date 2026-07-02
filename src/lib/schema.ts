// JSON-LD builders. Возвращают plain-объекты → рендерятся в <script type="application/ld+json">.

const SITE_NAME = 'Рідна вишивка';
const CONTACT_EMAIL = 'info@ridnavyshyvka.com.ua';
// Іменована авторка-майстриня (E-E-A-T): реальна людина.
const AUTHOR_NAME = 'Тетяна Римарьова';
const AUTHOR_ROLE = 'майстриня-рукодільниця';
function authorUrl(siteUrl: string) {
  return `${siteUrl}avtorka/`;
}

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
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: authorUrl(siteUrl),
      jobTitle: AUTHOR_ROLE,
      worksFor: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
    },
    publisher: publisherObject(siteUrl),
  };
}

// Розмітка сторінки авторки: ProfilePage + Person.
export function authorProfileSchema(siteUrl: string, opts?: { image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: authorUrl(siteUrl),
      jobTitle: AUTHOR_ROLE,
      description:
        'Майстриня з Києва: вишиває хрестиком і бісером, вʼяже спицями та гачком і шиє. Авторка й редакторка матеріалів сайту «Рідна вишивка».',
      knowsAbout: [
        'українська вишивка',
        'вишивка хрестиком',
        'вишивка бісером',
        'вʼязання',
        'шиття',
      ],
      homeLocation: { '@type': 'Place', name: 'Київ, Україна' },
      worksFor: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
      ...(opts?.image ? { image: opts.image } : {}),
    },
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

// Універсальна розмітка для службових сторінок (AboutPage / ContactPage / WebPage).
export function pageSchema(
  type: 'AboutPage' | 'ContactPage' | 'WebPage',
  p: { name: string; description?: string; url: string },
  siteUrl: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    url: p.url,
    inLanguage: 'uk',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: siteUrl },
    publisher: { '@id': `${siteUrl}#organization` },
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
