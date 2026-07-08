"""Клиент Facebook (Meta) Ad Library API.

Считает конкуренцию по нише в каждой стране: сколько активных объявлений,
сколько уникальных рекламодателей и как долго живут объявления (долгожительство
= косвенный сигнал прибыльного оффера).

ВАЖНО про покрытие API:
- В ЕС по регламенту DSA в Ad Library доступны ВСЕ объявления, включая
  коммерческие/e-commerce — это как раз наш случай.
- Вне ЕС endpoint `ads_archive` исторически отдаёт в основном
  политические/социальные объявления, коммерческих может не быть.
- Нужен access token (см. README, раздел «Получение токена»).

Документация: https://www.facebook.com/ads/library/api/
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Iterator

import requests

GRAPH_VERSION = "v21.0"
BASE_URL = f"https://graph.facebook.com/{GRAPH_VERSION}/ads_archive"

# Поля, которые нам реально нужны для метрик конкуренции.
FIELDS = ",".join(
    [
        "id",
        "page_id",
        "page_name",
        "ad_delivery_start_time",
        "ad_delivery_stop_time",
        "ad_snapshot_url",
        "publisher_platforms",
        "ad_creative_bodies",
        "ad_creative_link_titles",
    ]
)


@dataclass
class AdRecord:
    ad_id: str
    page_id: str
    page_name: str
    start: date | None
    stop: date | None
    is_active: bool
    snapshot_url: str
    platforms: list[str] = field(default_factory=list)


@dataclass
class CompetitionStats:
    country: str
    keyword: str
    num_ads: int
    num_advertisers: int
    median_ad_age_days: float | None
    max_ad_age_days: int | None
    active_ads: int
    top_advertisers: list[str]
    error: str | None = None


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        # Формат вида 2024-05-01 или 2024-05-01T00:00:00+0000
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def iter_ads(
    access_token: str,
    search_terms: str,
    country: str,
    *,
    ad_active_status: str = "ALL",
    ad_type: str = "ALL",
    page_limit: int = 100,
    max_pages: int = 5,
    session: requests.Session | None = None,
    today: date | None = None,
) -> Iterator[AdRecord]:
    """Итерирует объявления по одному ключу и одной стране (с пагинацией)."""
    sess = session or requests.Session()
    today = today or date.today()
    params = {
        "access_token": access_token,
        "search_terms": search_terms,
        "ad_reached_countries": f"['{country}']",
        "ad_active_status": ad_active_status,
        "ad_type": ad_type,
        "fields": FIELDS,
        "limit": page_limit,
    }
    url: str | None = BASE_URL
    pages = 0
    while url and pages < max_pages:
        resp = sess.get(url, params=params if url == BASE_URL else None, timeout=30)
        params = None  # для next-URL параметры уже вшиты
        if resp.status_code != 200:
            raise RuntimeError(f"Ad Library API {resp.status_code}: {resp.text[:300]}")
        payload = resp.json()
        for item in payload.get("data", []):
            start = _parse_date(item.get("ad_delivery_start_time"))
            stop = _parse_date(item.get("ad_delivery_stop_time"))
            yield AdRecord(
                ad_id=item.get("id", ""),
                page_id=item.get("page_id", ""),
                page_name=item.get("page_name", ""),
                start=start,
                stop=stop,
                is_active=stop is None or stop >= today,
                snapshot_url=item.get("ad_snapshot_url", ""),
                platforms=item.get("publisher_platforms", []) or [],
            )
        url = payload.get("paging", {}).get("next")
        pages += 1
        if url:
            time.sleep(1)  # бережём rate limit


def competition_stats(
    access_token: str,
    search_terms: str,
    country: str,
    *,
    today: date | None = None,
    **kwargs,
) -> CompetitionStats:
    """Собирает агрегированные метрики конкуренции по ключу и стране."""
    today = today or date.today()
    try:
        ads = list(iter_ads(access_token, search_terms, country, today=today, **kwargs))
    except Exception as exc:  # noqa: BLE001 - хотим вернуть ошибку в строке отчёта
        return CompetitionStats(
            country=country,
            keyword=search_terms,
            num_ads=0,
            num_advertisers=0,
            median_ad_age_days=None,
            max_ad_age_days=None,
            active_ads=0,
            top_advertisers=[],
            error=str(exc)[:200],
        )

    ages: list[int] = []
    advertisers: dict[str, int] = {}
    active = 0
    for ad in ads:
        if ad.is_active:
            active += 1
        if ad.start:
            ages.append((today - ad.start).days)
        key = ad.page_name or ad.page_id
        if key:
            advertisers[key] = advertisers.get(key, 0) + 1

    ages.sort()
    median_age = None
    if ages:
        mid = len(ages) // 2
        median_age = (
            ages[mid] if len(ages) % 2 else (ages[mid - 1] + ages[mid]) / 2
        )
    top = sorted(advertisers.items(), key=lambda kv: kv[1], reverse=True)[:5]

    return CompetitionStats(
        country=country,
        keyword=search_terms,
        num_ads=len(ads),
        num_advertisers=len(advertisers),
        median_ad_age_days=median_age,
        max_ad_age_days=max(ages) if ages else None,
        active_ads=active,
        top_advertisers=[name for name, _ in top],
    )
