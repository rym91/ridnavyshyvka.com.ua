#!/usr/bin/env python3
"""Сбор «лучших продаваемых товаров в Европе» — единая таблица товар × страна.

Что делает:
  1. Для каждого товара и страны берёт СПРОС из Google Trends (без токена).
  2. Для каждого товара и страны берёт КОНКУРЕНЦИЮ из Facebook Ad Library
     (нужен META_ACCESS_TOKEN; без него шаг пропускается).
  3. Считает opportunity_score = высокий спрос при умеренной конкуренции.
  4. Пишет результат в out/market_research.csv и out/market_research.json,
     отсортированный по opportunity_score.

Запуск:
    export META_ACCESS_TOKEN=...        # опционально, для конкуренции
    python collect.py                   # все товары/страны из keywords.json
    python collect.py --no-fb           # только спрос (Google Trends)
    python collect.py --no-trends       # только конкуренция (Facebook)
    python collect.py --countries DE,PL --products women_embroidered_blouse
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import pathlib
import sys
from dataclasses import asdict, dataclass

HERE = pathlib.Path(__file__).parent
OUT_DIR = HERE / "out"


@dataclass
class Row:
    product: str
    product_label: str
    country: str
    keyword: str
    demand_index: float | None
    trend_recent: float | None
    num_ads: int | None
    num_advertisers: int | None
    median_ad_age_days: float | None
    active_ads: int | None
    top_advertisers: str
    opportunity_score: float | None
    notes: str


def _competition_score(num_advertisers: int | None, median_age: float | None) -> float | None:
    """Насыщенность рынка: больше рекламодателей и старше объявления -> выше."""
    if num_advertisers is None:
        return None
    longevity = (median_age or 0) / 90.0  # 90 дней ~ «зрелый» оффер
    return num_advertisers * (1 + longevity)


def _opportunity(demand: float | None, competition: float | None) -> float | None:
    """Высокий спрос при низкой конкуренции = высокий балл."""
    if demand is None:
        return None
    if competition is None:  # нет данных FB — оцениваем только по спросу
        return round(demand, 1)
    return round(demand / (1 + competition), 2)


def collect(
    products: dict,
    countries: list[str],
    *,
    use_trends: bool,
    use_fb: bool,
    token: str | None,
) -> list[Row]:
    rows: list[Row] = []
    trends_mod = fb_mod = None
    if use_trends:
        import google_trends as trends_mod  # noqa: PLC0415
    if use_fb:
        import fb_ad_library as fb_mod  # noqa: PLC0415

    for pkey, pdata in products.items():
        label = pdata.get("label", pkey)
        kw_map = pdata.get("keywords_by_country", {})
        for country in countries:
            kws = kw_map.get(country)
            if not kws:
                continue
            keyword = kws[0]  # основной ключ для метрик; остальные — для ручной проверки
            notes: list[str] = []

            demand_index = trend_recent = None
            if trends_mod:
                d = trends_mod.demand_stat(keyword, country)
                demand_index, trend_recent = d.demand_index, d.trend_recent
                if d.error:
                    notes.append(f"trends: {d.error}")

            num_ads = num_advertisers = median_age = active = None
            top_adv = ""
            if fb_mod and token:
                c = fb_mod.competition_stats(token, keyword, country)
                num_ads, num_advertisers = c.num_ads, c.num_advertisers
                median_age, active = c.median_ad_age_days, c.active_ads
                top_adv = "; ".join(c.top_advertisers)
                if c.error:
                    notes.append(f"fb: {c.error}")

            comp = _competition_score(num_advertisers, median_age)
            rows.append(
                Row(
                    product=pkey,
                    product_label=label,
                    country=country,
                    keyword=keyword,
                    demand_index=demand_index,
                    trend_recent=trend_recent,
                    num_ads=num_ads,
                    num_advertisers=num_advertisers,
                    median_ad_age_days=median_age,
                    active_ads=active,
                    top_advertisers=top_adv,
                    opportunity_score=_opportunity(demand_index, comp),
                    notes="; ".join(notes),
                )
            )
            print(
                f"  {pkey:28} {country}  спрос={demand_index}  "
                f"объявл={num_ads}  рекламод={num_advertisers}",
                file=sys.stderr,
            )
    return rows


def write_outputs(rows: list[Row]) -> None:
    OUT_DIR.mkdir(exist_ok=True)
    rows_sorted = sorted(
        rows,
        key=lambda r: (r.opportunity_score is None, -(r.opportunity_score or 0)),
    )
    dicts = [asdict(r) for r in rows_sorted]

    (OUT_DIR / "market_research.json").write_text(
        json.dumps(dicts, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    with (OUT_DIR / "market_research.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(dicts[0].keys()) if dicts else [])
        writer.writeheader()
        writer.writerows(dicts)
    print(f"\nГотово. Строк: {len(rows)}. Файлы в {OUT_DIR}/", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser(description="Сбор лучших товаров ниши в Европе")
    ap.add_argument("--keywords", default=str(HERE / "keywords.json"))
    ap.add_argument("--countries", help="список ISO-кодов через запятую, напр. DE,PL")
    ap.add_argument("--products", help="ключи товаров через запятую")
    ap.add_argument("--no-trends", action="store_true", help="пропустить Google Trends")
    ap.add_argument("--no-fb", action="store_true", help="пропустить Facebook Ad Library")
    args = ap.parse_args()

    config = json.loads(pathlib.Path(args.keywords).read_text(encoding="utf-8"))
    products = config["products"]
    countries = config["countries"]

    if args.products:
        want = set(args.products.split(","))
        products = {k: v for k, v in products.items() if k in want}
    if args.countries:
        countries = args.countries.split(",")

    token = os.environ.get("META_ACCESS_TOKEN")
    use_fb = not args.no_fb
    if use_fb and not token:
        print(
            "META_ACCESS_TOKEN не задан — конкуренция (Facebook) пропущена. "
            "Считаю только спрос. Задайте токен или используйте --no-fb, чтобы убрать это сообщение.",
            file=sys.stderr,
        )
        use_fb = False

    rows = collect(
        products,
        countries,
        use_trends=not args.no_trends,
        use_fb=use_fb,
        token=token,
    )
    if rows:
        write_outputs(rows)
    else:
        print("Нет данных — проверьте keywords.json и фильтры.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
