import { SECTION_SLUGS } from '../content.config';

export interface SectionMeta {
  slug: (typeof SECTION_SLUGS)[number];
  title: string;
  description: string;
  order: number;
}

export const SECTIONS: SectionMeta[] = [
  {
    slug: 'vyshyvka-hrestykom',
    title: 'Вишивка хрестиком',
    description: 'Схеми, техніка та поради з вишивки хрестиком — від простих візерунків до картин.',
    order: 1,
  },
  {
    slug: 'vyshyvka-biserom',
    title: 'Вишивка бісером і прикраси',
    description: 'Схеми вишивки бісером, силянки, гердани, ікони та картини бісером.',
    order: 2,
  },
  {
    slug: 'tehniky-vyshyvky',
    title: 'Техніки вишивки',
    description: 'Гладь, стрічки, мережка, біла вишивка та рішельє — види швів і техніки.',
    order: 3,
  },
  {
    slug: 'vyshyvanka',
    title: 'Вишиванка та орнаменти',
    description: 'Види вишиванок, орнаменти та їх символіка, регіональні мотиви.',
    order: 4,
  },
  {
    slug: 'vyshyti-rushnyky',
    title: 'Рушники та обрядове',
    description: 'Весільні, великодні та обрядові рушники: символіка і схеми.',
    order: 5,
  },
  {
    slug: 'materialy-dlya-vyshyvky',
    title: 'Матеріали та інструменти',
    description: 'Канва, нитки муліне, тканини, голки та набори для вишивання.',
    order: 6,
  },
  {
    slug: 'ukrayinska-vyshyvka',
    title: 'Українська вишивка',
    description: 'Історія, види, символіка та значення кольорів української вишивки.',
    order: 7,
  },
];

export const sectionMap: Record<string, SectionMeta> = Object.fromEntries(
  SECTIONS.map((s) => [s.slug, s]),
);

export function getSection(slug: string): SectionMeta | undefined {
  return sectionMap[slug];
}
