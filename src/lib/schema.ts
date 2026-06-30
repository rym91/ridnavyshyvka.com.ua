// JSON-LD builders. Возвращают plain-объекты → рендерятся в <script type="application/ld+json">.

const SITE_NAME = 'Рідна вишивка';

export function organizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
  };
}

export function websiteSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    inLanguage: 'uk',
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
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
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
