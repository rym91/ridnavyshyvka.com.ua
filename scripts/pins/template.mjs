/**
 * HTML-шаблон пінів для Pinterest (1000×1500).
 * Три розкладки, усі в дизайн-системі сайту (Playfair Display + Manrope,
 * подільська палітра: #b3122b / #1a1714 / #faf7f2):
 *   A — фото 1000×1000 зверху, «прошита» червона пунктирна лінія, кремова панель знизу
 *   B — фото на весь пін, темний градієнт і текст білим унизу
 *   C — фото на весь пін, кремова картка по центру, червона плашка з доменом унизу
 *   D — «редакційна» смуга: заголовок зверху, фото-банер посередині, хук і домен унизу
 *       (для широких вихідних фото 1.8:1 і ширше — банер бере їх без розтягування)
 */

export const W = 1000;
export const H = 1500;

const BRAND = '#b3122b';
const INK = '#1a1714';
const INK_SOFT = '#4a4039';
const PAPER = '#faf7f2';

/** ✕-маркер бренду інлайновим SVG — не залежить від наявності гліфа у шрифті. */
function xMark(color, size = 26) {
  return `<svg class="x" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"
    fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round">
    <path d="M5 5 L19 19 M19 5 L5 19"/></svg>`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Мікротипографіка заголовка: короткі прийменники й сполучники не висять у кінці рядка,
 * а тире тримається за попереднім словом і не починає новий рядок.
 */
function typo(s) {
  return esc(s)
    .replace(/(^|\s)(і|й|у|в|з|із|зі|та|на|до|за|по|від|для|як|що|це)\s/gi, '$1$2 ')
    .replace(/\s+—\s+/g, ' — ');
}

function photoLayer(pin, extraClass = '') {
  const focus = pin.focus || '50% 50%';
  const zoom = pin.zoom || 1;
  // pan зсуває кадр після масштабування — фон-позиція не працює по осі,
  // де cover не дає перекриття (широке фото у високій рамці й навпаки).
  const [panX = '0%', panY = '0%'] = (pin.pan || '0% 0%').split(/\s+/);
  return `<div class="photo ${extraClass}" style="background-image:url('${pin.photoData}');
    background-position:${focus};transform:translate(${panX},${panY}) scale(${zoom})"></div>`;
}

function domainRow(color, xColor) {
  return `<div class="domain" style="color:${color}">${xMark(xColor, 26)}<span>ridnavyshyvka.com.ua</span></div>`;
}

function layoutA(pin) {
  return `
  <div class="pin layout-a">
    <div class="photo-box a-photo">${photoLayer(pin)}</div>
    <div class="stitch"></div>
    <div class="panel">
      <div class="eyebrow" style="color:${BRAND}">${esc(pin.eyebrow)}</div>
      <h1 class="headline fit" style="color:${INK}">${typo(pin.headline)}</h1>
      ${domainRow(BRAND, BRAND)}
    </div>
  </div>`;
}

function layoutB(pin) {
  return `
  <div class="pin layout-b">
    <div class="photo-box full">${photoLayer(pin)}</div>
    <div class="scrim-b"></div>
    <div class="b-content">
      <div class="eyebrow" style="color:#f0a2ab">${esc(pin.eyebrow)}</div>
      <h1 class="headline fit" style="color:#fff">${typo(pin.headline)}</h1>
      ${domainRow('#fff', '#fff')}
    </div>
  </div>`;
}

function layoutC(pin) {
  const hook = pin.hook ? `<p class="hook">${typo(pin.hook)}</p>` : '';
  return `
  <div class="pin layout-c">
    <div class="photo-box full">${photoLayer(pin)}</div>
    <div class="scrim-c"></div>
    <div class="card">
      <div class="eyebrow" style="color:${BRAND}">${esc(pin.eyebrow)}</div>
      <h1 class="headline fit" style="color:${INK}">${typo(pin.headline)}</h1>
      <div class="rule"></div>
      ${hook}
    </div>
    <div class="bar">${xMark('#fff', 24)}<span>ridnavyshyvka.com.ua</span></div>
  </div>`;
}

function layoutD(pin) {
  const hook = pin.hook ? `<p class="hook">${typo(pin.hook)}</p>` : '';
  return `
  <div class="pin layout-d">
    <div class="d-top">
      <div class="eyebrow" style="color:${BRAND}">${esc(pin.eyebrow)}</div>
      <h1 class="headline fit" style="color:${INK}">${typo(pin.headline)}</h1>
    </div>
    <div class="d-band">${photoLayer(pin)}</div>
    <div class="d-bottom">
      ${hook}
      ${domainRow(BRAND, BRAND)}
    </div>
  </div>`;
}

const LAYOUTS = { A: layoutA, B: layoutB, C: layoutC, D: layoutD };

export function buildHtml(pin, fontCss) {
  const body = (LAYOUTS[pin.layout] || layoutA)(pin);
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<style>
${fontCss}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;background:${PAPER}}
body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.pin{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${PAPER}}
.photo-box{position:absolute;left:0;top:0;width:${W}px;overflow:hidden}
.photo-box.a-photo{height:1000px}
.photo-box.full{height:${H}px}
.photo{position:absolute;inset:-2px;background-size:cover;background-repeat:no-repeat;transform-origin:center}

/* A */
.layout-a .stitch{position:absolute;top:1000px;left:0;width:${W}px;border-top:7px dashed ${BRAND}}
.layout-a .panel{position:absolute;top:1007px;left:0;width:${W}px;height:493px;background:${PAPER};padding:66px 62px 0}
.layout-a .headline{margin-top:24px}

/* B */
.scrim-b{position:absolute;inset:0;background:linear-gradient(to top,
  rgba(26,23,20,.92) 0%, rgba(26,23,20,.84) 12%, rgba(26,23,20,.52) 24%,
  rgba(26,23,20,.18) 36%, rgba(26,23,20,0) 50%)}
.b-content{position:absolute;left:0;bottom:0;width:${W}px;padding:0 62px 54px}
.layout-b .headline{margin-top:20px;margin-bottom:26px}

/* C */
.scrim-c{position:absolute;inset:0;background:linear-gradient(to bottom,
  rgba(26,23,20,.34) 0%, rgba(26,23,20,.14) 35%, rgba(26,23,20,.14) 65%, rgba(26,23,20,.40) 100%)}
.layout-c .card{position:absolute;left:56px;right:56px;top:50%;transform:translateY(-52%);
  background:${PAPER};padding:60px 52px 58px;border:1px solid rgba(179,18,43,.30);
  box-shadow:0 18px 48px rgba(26,23,20,.22)}
.layout-c .card::before{content:"";position:absolute;left:52px;right:52px;top:26px;border-top:4px dashed ${BRAND};opacity:.9}
.layout-c .headline{margin-top:22px}
.layout-c .rule{width:64px;border-top:4px dashed ${BRAND};margin:26px 0 22px}
.layout-c .hook{font-family:Manrope,sans-serif;font-weight:500;font-size:27px;line-height:1.4;color:${INK_SOFT}}
.layout-c .bar{position:absolute;left:0;bottom:0;width:${W}px;height:92px;background:${BRAND};
  display:flex;align-items:center;justify-content:center;gap:12px;
  font-family:Manrope,sans-serif;font-weight:600;font-size:30px;color:#fff;letter-spacing:.01em}

/* D */
.layout-d{background:${PAPER};
  background-image:linear-gradient(to right,rgba(26,23,20,.03) 1px,transparent 1px),
    linear-gradient(to bottom,rgba(26,23,20,.03) 1px,transparent 1px);
  background-size:10px 10px}
.layout-d .d-top{position:absolute;left:0;top:0;width:${W}px;height:400px;padding:0 62px;
  display:flex;flex-direction:column;justify-content:center}
.layout-d .headline{margin-top:22px}
.layout-d .d-band{position:absolute;left:0;top:400px;width:${W}px;height:700px;overflow:hidden;
  border-top:6px dashed ${BRAND};border-bottom:6px dashed ${BRAND}}
.layout-d .d-band .photo{inset:-8px}
.layout-d .d-bottom{position:absolute;left:0;top:1100px;width:${W}px;height:400px;padding:0 62px 96px;
  display:flex;flex-direction:column;justify-content:center}
.layout-d .hook{font-family:Manrope,sans-serif;font-weight:500;font-size:29px;line-height:1.42;color:${INK_SOFT}}

/* спільне */
.eyebrow{font-family:Manrope,sans-serif;font-weight:700;font-size:21px;letter-spacing:.2em;text-transform:uppercase}
.headline{font-family:"Playfair Display",Georgia,serif;font-weight:700;font-size:62px;line-height:1.10;
  letter-spacing:-.005em;text-wrap:balance;overflow-wrap:break-word}
.domain{position:absolute;left:62px;bottom:52px;display:flex;align-items:center;gap:11px;
  font-family:Manrope,sans-serif;font-weight:500;font-size:30px;letter-spacing:.005em}
.layout-b .domain{position:static;padding:0}
.domain .x{flex:none}
</style></head><body>${body}</body></html>`;
}
