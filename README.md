# ridnavyshyvka.com.ua

Україномовний контент-сайт про вишивку (Astro, статика). Phase 1 — контент + SEO.

Документація проєкту: `../specs/001-vyshyvka-site/` (spec, content-map, plan, contracts, tasks).

## Команди
- `npm run dev` — локальна розробка (http://localhost:4321)
- `npm run build` — збірка в `dist/`
- `npm run preview` — попередній перегляд збірки
- `npm run check` — перевірка типів і контент-колекцій

## Структура
- `src/content/` — контент (колекції `pages`, `sections`)
- `src/layouts/` — BaseLayout + шаблони Pillar/Category/Article
- `src/components/` — Seo, JSON-LD, Breadcrumbs, Picture, LeadMagnet
- `src/pages/` — маршрути (`/`, `/[section]`, `/[section]/[slug]`)
