/**
 * Налаштування Google AdSense.
 *
 * Єдине місце, де живе ідентифікатор видавця: з нього збирається і скрипт
 * у <head>, і файл ads.txt. Поки рядок порожній, на сайті немає ні того,
 * ні того — так само, як з GA_ID в Analytics.astro.
 *
 * Де взяти: AdSense → Акаунт → Інформація про акаунт → «Ідентифікатор
 * видавця». Виглядає як pub-0000000000000000.
 *
 * Вставляти тільки сам ідентифікатор, без префікса «ca-». Формат перевіряє
 * PUBLISHER_RE нижче: помилковий рядок просто вимкне рекламу, замість того
 * щоб мовчки віддати в <head> зламаний скрипт.
 */
export const ADSENSE_PUBLISHER_ID = '';

const PUBLISHER_RE = /^pub-\d{16}$/;

export const adsenseEnabled = PUBLISHER_RE.test(ADSENSE_PUBLISHER_ID);

/** Значення для атрибута data-ad-client і для URL скрипта. */
export const adsenseClient = `ca-${ADSENSE_PUBLISHER_ID}`;

/**
 * Рядок ads.txt. Google вважає відсутній ads.txt приводом притримати частину
 * показів, тож файл має зʼявитися разом із рекламою, а не колись потім.
 * DIRECT означає, що інвентар продає сам власник сайту; f08c47fec0942fa0 —
 * постійний ідентифікатор Google у цій системі, однаковий для всіх.
 */
export const adsTxt = adsenseEnabled
  ? `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`
  : '';
