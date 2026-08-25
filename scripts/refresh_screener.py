#!/usr/bin/env python3
"""Build the daily low-volatility dividend Top 10 from local market data."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "screener.json"
SYMBOLS = ROOT / "data" / "symbols.json"
SHANGHAI = ZoneInfo("Asia/Shanghai")


def cli(*args: str) -> dict:
    result = subprocess.run(["hithink-finance", *args, "--format", "json"], text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    payload = json.loads(result.stdout)
    if not payload.get("ok"):
        raise RuntimeError(payload.get("error", {}).get("message", "hithink-finance failed"))
    return payload


def build() -> dict:
    now = datetime.now(SHANGHAI)
    basis = now.year - 1
    symbols_payload = json.loads(SYMBOLS.read_text(encoding="utf-8"))
    names = {item["thscode"]: item.get("name") for item in symbols_payload["data"]["item"]}
    sql = f"""
    WITH fiscal_dividends AS (
      SELECT thscode,
        CASE WHEN month(ex_date) >= 9 THEN year(ex_date) ELSE year(ex_date)-1 END AS fiscal_year,
        sum(dividend_per_share) AS dividend
      FROM raw_adjustment_events
      WHERE dividend_per_share > 0
      GROUP BY 1,2
    ),
    dividends AS (
      SELECT thscode,
        max(CASE WHEN fiscal_year={basis} THEN dividend END) AS d0,
        max(CASE WHEN fiscal_year={basis-1} THEN dividend END) AS d1,
        max(CASE WHEN fiscal_year={basis-2} THEN dividend END) AS d2,
        count(*) FILTER (WHERE fiscal_year BETWEEN {basis-4} AND {basis}) AS dividend_years
      FROM fiscal_dividends GROUP BY 1
    ),
    daily_returns AS (
      SELECT d.*, lag(close) OVER (PARTITION BY thscode ORDER BY date) AS prior_close
      FROM v_daily d
    ),
    ranked_daily AS (
      SELECT d.*, row_number() OVER (PARTITION BY thscode ORDER BY date DESC) AS rn,
        CASE WHEN prior_close>0 THEN close/prior_close-1 END AS daily_return
      FROM daily_returns d
    ),
    market_stats AS (
      SELECT thscode,
        max(date) FILTER (WHERE rn=1) AS price_date,
        max(close) FILTER (WHERE rn=1) AS last_price,
        max(amount) FILTER (WHERE rn=1) AS last_amount,
        avg(close) FILTER (WHERE rn<=20) AS ma20,
        stddev_pop(close) FILTER (WHERE rn<=20) AS sd20,
        stddev_pop(daily_return) FILTER (WHERE rn<=60) * sqrt(250) AS annual_vol
      FROM ranked_daily WHERE rn<=60 GROUP BY 1
    ),
    eligible AS (
      SELECT m.thscode, s.name, m.price_date, m.last_price, d.d0 AS dividend_per_share,
        d.d0/m.last_price*100 AS dividend_yield_pct, d.dividend_years,
        m.ma20, m.sd20, m.annual_vol,
        greatest(0, least(100, 100-m.annual_vol*180)) AS volatility_score,
        CASE WHEN m.last_price <= m.ma20-m.sd20 THEN '靠近下轨'
             WHEN m.last_price >= m.ma20+m.sd20 THEN '靠近上轨' ELSE 'BOLL中部' END AS boll_label
      FROM market_stats m JOIN dividends d USING(thscode) LEFT JOIN v_symbol s USING(thscode)
      WHERE d.d0>0 AND d.d1>0 AND d.d2>0 AND m.last_price>2 AND m.last_amount>=10000000
        AND d.d0/m.last_price BETWEEN 0.03 AND 0.12
    ),
    scored AS (
      SELECT *, round(least(dividend_yield_pct,10)*7 + least(dividend_years,5)*4
        + CASE boll_label WHEN '靠近下轨' THEN 10 WHEN 'BOLL中部' THEN 5 ELSE 0 END
        + volatility_score*.1, 2) AS score,
        count(*) OVER () AS eligible_count
      FROM eligible
    )
    SELECT thscode, coalesce(name, thscode) AS name, price_date, round(last_price,2) AS last_price,
      round(dividend_per_share,7) AS dividend_per_share,
      round(dividend_yield_pct,2) AS dividend_yield_pct,
      round(dividend_per_share/.06,2) AS low_price,
      round(dividend_per_share/.055,2) AS mid_price,
      round(dividend_per_share/.05,2) AS high_price,
      dividend_years, boll_label, round(volatility_score,1) AS volatility_score,
      score, eligible_count
    FROM scored ORDER BY score DESC, dividend_yield_pct DESC
    """
    rows = cli("db", "query", "--sql", sql)["data"]
    coverage = cli("db", "query", "--sql", "SELECT count(DISTINCT thscode) AS universe_count, max(date) AS latest_date FROM v_daily")["data"][0]
    for row in rows:
        row["name"] = names.get(row["thscode"]) or row["thscode"]
        for key in ("last_price", "dividend_per_share", "dividend_yield_pct", "low_price", "mid_price", "high_price", "volatility_score", "score"):
            row[key] = float(row[key])
        for key in ("dividend_years", "eligible_count"):
            row[key] = int(row[key])
    return {
        "as_of": now.isoformat(timespec="seconds"),
        "market_data_date": coverage["latest_date"],
        "basis_fiscal_year": basis,
        "universe_count": int(coverage["universe_count"]),
        "eligible_count": rows[0]["eligible_count"] if rows else 0,
        "method": "连续3个完整财年分红；静态股息率3%–12%；最近成交额不低于1000万元；按股息率、连续分红、日线BOLL位置与60日低波动综合排序。公司行动数据不含报告期，统一采用9–12月归当年中报、次年1–8月归上一财年年报的代理规则。",
        "top10": rows[:10],
        "candidates": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sync", action="store_true", help="Sync local market database first")
    args = parser.parse_args()
    if args.sync:
        cli("data", "sync")
        cli("symbol", "list", "--exchange", "SH,SZ", "--asset-type", "a-share", "--limit", "10000", "--offset", "0", "--output", str(SYMBOLS))
    payload = build()
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
