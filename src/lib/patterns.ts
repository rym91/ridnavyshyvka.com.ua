/**
 * Реєстр безкоштовних PDF-схем і тематичних бандлів.
 *
 * Модель роздачі — гібрид:
 *  - окремі схеми (`patterns` у frontmatter) качаються прямо зі сторінки, без умов;
 *  - повний тематичний бандл (`bundle`) віддається в Telegram-каналі.
 *
 * Джерело файлів: vyshyvka-pdf-store/products/lead-magnets → site/public/pdf/
 */

export interface Pattern {
  /** Імʼя PDF без розширення в /public/pdf/ */
  file: string;
  name: string;
  /** Розмір у хрестиках / бісеринах */
  w: number;
  h: number;
  kind: 'hrestyk' | 'sylianka' | 'gerdan';
  difficulty?: string;
  hours?: string;
}

export interface Bundle {
  name: string;
  desc: string;
  /** Ключі схем із PATTERNS */
  patterns: string[];
}

/**
 * Telegram-канал роздачі бандлів.
 * Коли канал створено — виставити enabled: true і вписати url.
 * Більше нічого міняти не треба: всі кнопки по сайту оживуть самі.
 */
export const TELEGRAM = {
  enabled: true,
  handle: '@ridnavyshyvka',
  url: 'https://t.me/ridnavyshyvka',
  /**
   * Username бота роздачі (без @). Поки порожньо — кнопки ведуть на сам канал.
   * Щойно бот створений у @BotFather — вписати сюди, і кожна кнопка почне вести
   * одразу на потрібний набір із перевіркою підписки.
   */
  bot: '',
};

/** Куди веде кнопка «забрати набір»: у бота з потрібним бандлом або просто в канал. */
export const bundleLink = (key: string) =>
  TELEGRAM.bot ? `https://t.me/${TELEGRAM.bot}?start=${key}` : TELEGRAM.url;

export const PATTERNS: Record<string, Pattern> = {
  // — хрестик: весільні / рушникові —
  vazon: { file: 'vazonderevozhyttia', name: 'Вазон (дерево життя)', w: 29, h: 49, kind: 'hrestyk' },
  vynohrad: { file: 'vynohradnehrono', name: 'Виноградне гроно', w: 17, h: 33, kind: 'hrestyk' },
  bezkinechnyk: { file: 'bezkinechnykmeandr', name: 'Безкінечник (меандр)', w: 36, h: 19, kind: 'hrestyk' },
  bihunets: { file: 'bihunetszlystochkamy', name: 'Бігунець із листочками', w: 40, h: 7, kind: 'hrestyk' },
  'kalyna-vesilna': { file: 'kalyna-vesilna', name: 'Калина весільна', w: 35, h: 45, kind: 'hrestyk', difficulty: 'Середній', hours: '8-10 годин' },

  // — хрестик: базові / для новачків —
  dubove: { file: 'dubovelystiazzholudiamy', name: 'Дубове листя з жолудями', w: 19, h: 29, kind: 'hrestyk' },
  romb: { file: 'rombzhachkamy', name: 'Ромб із гачками', w: 27, h: 27, kind: 'hrestyk' },
  kvitka: { file: 'kvitka-nova', name: 'Квіточка', w: 20, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '2-3 години' },
  serce: { file: 'serce-nova', name: 'Серце', w: 20, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '2-3 години' },
  zirka: { file: 'zirka-nova', name: 'Зірочка', w: 20, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '2-3 години' },
  kvitka5: { file: 'kvitka5', name: 'Квітка 5-пелюсткова', w: 20, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '1-2 години' },

  // — хрестик: обереги —
  kalynaoberih: { file: 'kalynaoberih', name: 'Калина-оберіг', w: 20, h: 25, kind: 'hrestyk', difficulty: 'Початковий', hours: '3-4 години' },
  tryzub: { file: 'tryzub', name: 'Тризуб (орнаментальний)', w: 35, h: 50, kind: 'hrestyk', difficulty: 'Середній', hours: '10-12 годин' },
  khrysttryzub: { file: 'khrysttryzub', name: 'Хрест-Тризуб', w: 25, h: 30, kind: 'hrestyk', difficulty: 'Середній', hours: '7-8 годин' },
  sonce: { file: 'sonce', name: 'Сонце', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '4-5 годин' },
  zirkadva: { file: 'zirkadva', name: 'Подвійна зірка', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  khryst: { file: 'khryst', name: 'Хрест', w: 20, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '2-3 години' },
  karpatskyi: { file: 'karpatskyi', name: 'Карпатський ромб', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },

  // — хрестик: квіти —
  maky: { file: 'maky', name: 'Маки', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  soniakhy: { file: 'soniakhy', name: 'Соняхи', w: 25, h: 30, kind: 'hrestyk', difficulty: 'Середній', hours: '6-7 годин' },
  pivonii: { file: 'pivonii', name: 'Півонії', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  troiandy: { file: 'troiandy', name: 'Троянди', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  lilii: { file: 'lilii', name: 'Лілії', w: 20, h: 30, kind: 'hrestyk', difficulty: 'Середній', hours: '6-7 годин' },

  // — хрестик: дитячі —
  sonechko: { file: 'sonechko', name: 'Сонечко', w: 20, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '1-2 години' },
  metelyk: { file: 'metelyk', name: 'Метелик', w: 25, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '2-3 години' },
  ryba: { file: 'ryba', name: 'Риба', w: 25, h: 15, kind: 'hrestyk', difficulty: 'Початковий', hours: '1-2 години' },
  polunycya: { file: 'polunycya', name: 'Полуниця', w: 20, h: 20, kind: 'hrestyk', difficulty: 'Початковий', hours: '1-2 години' },

  // — хрестик: великодні —
  kvochka: { file: 'kvochka', name: 'Квочка з курчатами', w: 25, h: 30, kind: 'hrestyk', difficulty: 'Середній', hours: '6-7 годин' },
  pysanky: { file: 'pysanky', name: 'Писанки', w: 25, h: 20, kind: 'hrestyk', difficulty: 'Середній', hours: '4-5 годин' },
  kvitkaPascha: { file: 'kvitkaPascha', name: 'Квітка Пасха', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },

  // — хрестик: регіональні —
  galycka: { file: 'galycka', name: 'Галицька кривулька', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  hutsulska: { file: 'hutsulska', name: 'Гуцульський ромб', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  podilska: { file: 'podilska', name: 'Подільська зірка', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  poltavska: { file: 'poltavska', name: 'Полтавська гілка', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },
  centralna: { file: 'centralna', name: 'Центральний вазон', w: 25, h: 25, kind: 'hrestyk', difficulty: 'Середній', hours: '5-6 годин' },

  // — бісер: силянки та гердани —
  'sylianka-zyhzah': { file: 'sylianka-zyhzah', name: 'Силянка-зигзаг', w: 30, h: 10, kind: 'sylianka', difficulty: 'Початковий', hours: '1-2 години' },
  'sylianka-kvity': { file: 'sylianka-kvity', name: 'Силянка-квіти', w: 40, h: 12, kind: 'sylianka', difficulty: 'Середній', hours: '2-3 години' },
  'sylianka-romby': { file: 'sylianka-romby', name: 'Силянка-ромби', w: 35, h: 12, kind: 'sylianka', difficulty: 'Середній', hours: '2-3 години' },
  'gerdan-zyhzah': { file: 'gerdan-zyhzah', name: 'Гердан-зигзаг', w: 50, h: 10, kind: 'gerdan', difficulty: 'Середній', hours: '3-4 години' },
  'gerdan-romby': { file: 'gerdan-romby', name: 'Гердан-ромби', w: 50, h: 14, kind: 'gerdan', difficulty: 'Середній', hours: '4-5 годин' },
};

export const BUNDLES: Record<string, Bundle> = {
  'sylianky-ta-gerdany': {
    name: 'Силянки та гердани',
    desc: '5 схем бісерних прикрас: три силянки та два гердани — від зигзагу для новачка до ромбів.',
    patterns: ['sylianka-zyhzah', 'sylianka-kvity', 'sylianka-romby', 'gerdan-zyhzah', 'gerdan-romby'],
  },
  'dlya-novachkiv': {
    name: 'Для новачків',
    desc: '6 простих схем хрестиком на 1-4 години: бігунець, ромб, дубове листя, квіточка, серце, зірочка.',
    patterns: ['bihunets', 'romb', 'dubove', 'kvitka', 'serce', 'zirka'],
  },
  'veseilnyi-rushnyk': {
    name: 'Весільний рушник',
    desc: '5 традиційних схем для весільного рушника: вазон, виноградне гроно, безкінечник, бігунець, калина.',
    patterns: ['vazon', 'vynohrad', 'bezkinechnyk', 'bihunets', 'kalyna-vesilna'],
  },
  oberehy: {
    name: 'Обереги',
    desc: '5 оберегових схем: калина-оберіг, тризуб, сонце, подвійна зірка, хрест.',
    patterns: ['kalynaoberih', 'tryzub', 'sonce', 'zirkadva', 'khryst'],
  },
  'cholovicha-sorochka': {
    name: 'Чоловіча сорочка',
    desc: '4 схеми для чоловічої вишиванки: дубове листя, ромб із гачками, хрест-тризуб, карпатський ромб.',
    patterns: ['dubove', 'romb', 'khrysttryzub', 'karpatskyi'],
  },
  'suchasni-kvity': {
    name: 'Сучасні квіти',
    desc: '5 квіткових схем хрестиком: маки, соняхи, півонії, троянди, лілії.',
    patterns: ['maky', 'soniakhy', 'pivonii', 'troiandy', 'lilii'],
  },
  dytiachi: {
    name: 'Дитячі',
    desc: '5 простих дитячих схем: сонечко, метелик, риба, полуниця, квітка.',
    patterns: ['sonechko', 'metelyk', 'ryba', 'polunycya', 'kvitka5'],
  },
  velykodni: {
    name: 'Великодні',
    desc: '3 великодні схеми: квочка з курчатами, писанки, квітка Пасха.',
    patterns: ['kvochka', 'pysanky', 'kvitkaPascha'],
  },
  regionalni: {
    name: 'Регіональні',
    desc: '5 схем за регіонами: галицька, гуцульська, подільська, полтавська, центральна.',
    patterns: ['galycka', 'hutsulska', 'podilska', 'poltavska', 'centralna'],
  },
};

export const patternUrl = (p: Pattern) => `/pdf/${p.file}.pdf`;

export const KIND_LABEL: Record<Pattern['kind'], string> = {
  hrestyk: 'хрестиком',
  sylianka: 'силянка з бісеру',
  gerdan: 'гердан з бісеру',
};
