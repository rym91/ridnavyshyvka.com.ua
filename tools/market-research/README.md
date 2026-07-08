# Market Research — лучшие товары ниши в Европе

Инструмент для автоматизации разведки **спроса** и **конкуренции** по нише
(вишиванка / украинская этника) в странах Европы. Первый шаг маркетинговой
воронки: собрать «лучшие продаваемые товары» перед запуском Facebook-рекламы.

Инструмент **не зависит** от Astro-сайта — это отдельная папка с Python-скриптами.

## Что он делает

Для каждой пары **товар × страна** собирает единую таблицу:

| Метрика | Источник | Что показывает | Токен |
|---|---|---|---|
| `demand_index`, `trend_recent` | Google Trends (`pytrends`) | спрос и его свежесть (0–100) | не нужен |
| `num_ads`, `num_advertisers` | Facebook Ad Library API | сколько рекламы и рекламодателей | нужен |
| `median_ad_age_days` | Facebook Ad Library API | долгожительство = сигнал прибыльного оффера | нужен |
| `opportunity_score` | расчёт | высокий спрос при умеренной конкуренции | — |

Результат сортируется по `opportunity_score` и пишется в `out/market_research.csv`
и `out/market_research.json`.

## Быстрый старт

```bash
cd tools/market-research
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Вариант A: только спрос (без токена)
python collect.py --no-fb

# Вариант B: спрос + конкуренция (с токеном Meta)
cp .env.example .env          # впишите META_ACCESS_TOKEN
export $(grep -v '^#' .env | xargs)
python collect.py
```

Полезные флаги:

```bash
python collect.py --countries DE,PL,IT      # только эти страны
python collect.py --products women_embroidered_blouse,men_embroidered_shirt
python collect.py --no-trends               # только конкуренция
```

## Настройка ниши

Правьте `keywords.json` — товары и ключевые слова **на локальных языках**
по каждой стране. Это критично: Ad Library и Trends работают по локальному
запросу («bestickte Bluse», «haftowana bluzka»), а не по английскому.

## Получение токена Meta (Facebook Ad Library API)

1. Зарегистрируйте аккаунт разработчика: https://developers.facebook.com/
2. Пройдите **идентификацию** (подтверждение личности) — без неё Ad Library API
   не отдаёт данные.
3. Создайте приложение (тип «Business» или «Other»).
4. В **Graph API Explorer** сгенерируйте User Access Token и обменяйте на
   долгоживущий (long-lived) токен.
5. Впишите его в `.env` как `META_ACCESS_TOKEN`.

Документация: https://www.facebook.com/ads/library/api/

### Важно про покрытие данных

- **ЕС (DSA):** в Ad Library доступны **все** объявления, включая
  коммерческие/e-commerce — это наш случай для DE, PL, IT, FR, ES, NL, CZ, AT.
- **Вне ЕС** (напр. GB, UA) endpoint `ads_archive` может отдавать только
  политические/социальные объявления. Для коммерческой разведки там используйте
  UI Ad Library вручную или spy-инструменты (см. PLAYBOOK.md).
- Google Trends покрывает все страны и токена не требует — поэтому спрос
  собирается везде, даже без Meta-токена.

## Как это ложится в общую воронку

Этот скрипт закрывает **шаг 1** (спрос) и **шаг 2** (конкуренция) из общего
плана автоматизации. Полная методология, сравнение стран по «выигрышным»
офферам и no-code-альтернативы — в [PLAYBOOK.md](./PLAYBOOK.md).

## Ограничения (честно)

- Google Trends жёстко лимитирует частоту запросов (429). Скрипт делает паузы;
  для большого числа ключей запускайте пакетами или с бóльшим `pause`.
- Ad Library API не даёт числа продаж — «долгожительство объявления» это
  *косвенный* сигнал прибыльности оффера, а не факт продаж.
- Индекс Trends относительный (0–100 внутри запроса), не абсолютные объёмы.
  Для абсолютных объёмов поиска — Google Keyword Planner / Ahrefs / Semrush.
