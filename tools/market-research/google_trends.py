"""Сигнал спроса через Google Trends (библиотека pytrends).

Токен НЕ нужен. Возвращает индекс интереса (0-100) по ключу и стране за
выбранный период. Google Trends агрессивно ограничивает частоту запросов —
между запросами делаем паузу и обрабатываем 429.
"""

from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class DemandStat:
    country: str
    keyword: str
    demand_index: float | None  # средний интерес за период (0-100)
    trend_recent: float | None  # интерес за последнюю точку (свежесть спроса)
    error: str | None = None


def demand_stat(
    keyword: str,
    country: str,
    *,
    timeframe: str = "today 12-m",
    pause: float = 2.0,
    hl: str = "en-US",
) -> DemandStat:
    """Индекс спроса по одному ключу и одной стране за период."""
    try:
        from pytrends.request import TrendReq  # ленивый импорт — необязательная зависимость
    except ImportError:
        return DemandStat(
            country=country,
            keyword=keyword,
            demand_index=None,
            trend_recent=None,
            error="pytrends не установлен (pip install -r requirements.txt)",
        )

    try:
        pytrends = TrendReq(hl=hl, tz=0)
        pytrends.build_payload([keyword], geo=country, timeframe=timeframe)
        df = pytrends.interest_over_time()
        time.sleep(pause)
        if df is None or df.empty or keyword not in df.columns:
            return DemandStat(country, keyword, 0.0, 0.0, error="нет данных")
        series = df[keyword]
        return DemandStat(
            country=country,
            keyword=keyword,
            demand_index=round(float(series.mean()), 1),
            trend_recent=round(float(series.iloc[-1]), 1),
        )
    except Exception as exc:  # noqa: BLE001
        return DemandStat(country, keyword, None, None, error=str(exc)[:200])
