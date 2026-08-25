#!/usr/bin/env python3
"""Refresh market inputs and build the dividend-grid dashboard payload."""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SHANGHAI = ZoneInfo("Asia/Shanghai")
THSCODE = "000423.SZ"
NAME = "东阿阿胶"


def run_cli(*args: str) -> None:
    result = subprocess.run(
        ["hithink-finance", *args, "--format", "json"],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def as_date(timestamp_ms: int) -> datetime:
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).astimezone(SHANGHAI)


def normalize_history(envelope: dict) -> list[dict]:
    """Accept both legacy remote envelopes and the current CLI row format."""
    data = envelope["data"]
    if isinstance(data, dict):
        return data["item"]
    return [
        {
            "date_ms": int(datetime.fromisoformat(row["date"]).replace(tzinfo=SHANGHAI).timestamp() * 1000),
            "open_price": row["open"],
            "high_price": row["high"],
            "low_price": row["low"],
            "close_price": row["close"],
        }
        for row in data
    ]


def report_cycle(ex_date: datetime) -> tuple[int, str, str]:
    """Attribute cash payouts to the report that declared them.

    HiThink corporate actions currently omits the report period. Dong-E-E-Jiao's
    interim dividend is normally implemented from September onward in the same
    year; January-August implementations are attributed to the prior annual
    report. Keep this explicit so the dashboard never groups by calendar year.
    """
    if ex_date.month >= 9:
        return ex_date.year, "interim", "中报"
    return ex_date.year - 1, "annual", "年报"


def ema(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    alpha = 2 / (period + 1)
    result = [values[0]]
    for value in values[1:]:
        result.append(alpha * value + (1 - alpha) * result[-1])
    return result


def boll(values: list[float], period: int = 20) -> dict:
    window = values[-period:]
    if len(window) < period:
        return {"available": False}
    middle = sum(window) / period
    variance = sum((value - middle) ** 2 for value in window) / period
    std = math.sqrt(variance)
    lower, upper, current = middle - 2 * std, middle + 2 * std, values[-1]
    position = 0.5 if upper == lower else (current - lower) / (upper - lower)
    if position <= 0.2:
        zone, label = "near-lower", "靠近下轨"
    elif position >= 0.8:
        zone, label = "near-upper", "靠近上轨"
    else:
        zone, label = "middle", "区间中部"
    return {
        "available": True,
        "current": round(current, 2), "lower": round(lower, 2),
        "middle": round(middle, 2), "upper": round(upper, 2),
        "position": round(position, 4), "zone": zone, "label": label,
    }


def aggregate(rows: list[dict], mode: str) -> list[dict]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        date = as_date(row["date_ms"])
        if mode == "week":
            iso_year, iso_week, _ = date.isocalendar()
            key = f"{iso_year}-W{iso_week:02d}"
        else:
            key = date.strftime("%Y-%m")
        groups[key].append(row)
    return [
        {"key": key, "close": items[-1]["close_price"],
         "high": max(item["high_price"] for item in items),
         "low": min(item["low_price"] for item in items)}
        for key, items in sorted(groups.items())
    ]


def build_payload() -> dict:
    history_envelope = read_json(DATA_DIR / "history.json")
    dividend_envelope = read_json(DATA_DIR / "dividends.json")
    snapshot_envelope = read_json(DATA_DIR / "snapshot.json")
    rows = normalize_history(history_envelope)
    snapshot = snapshot_envelope["data"]["item"][0]
    snapshot_time = as_date(snapshot_envelope["data"]["timestamp"])

    today_key = snapshot_time.strftime("%Y-%m-%d")
    live_bar = {"date_ms": snapshot_envelope["data"]["timestamp"],
                "open_price": snapshot["open_price"], "high_price": snapshot["high_price"],
                "low_price": snapshot["low_price"], "close_price": snapshot["last_price"]}
    if rows and as_date(rows[-1]["date_ms"]).strftime("%Y-%m-%d") == today_key:
        rows[-1] = {**rows[-1], **live_bar}
    else:
        rows.append(live_bar)

    fiscal_years: dict[int, list[dict]] = defaultdict(list)
    for item in dividend_envelope["data"]["item"]:
        date = as_date(item["ex_date_ms"])
        fiscal_year, report_type, report_label = report_cycle(date)
        fiscal_years[fiscal_year].append({
            "date": date.strftime("%Y-%m-%d"),
            "per_share": item["dividend_per_share"],
            "report_type": report_type,
            "report_label": report_label,
        })
    basis_fiscal_year = snapshot_time.year - 1
    basis_items = sorted(fiscal_years.get(basis_fiscal_year, []), key=lambda item: item["date"])
    dividend = sum(item["per_share"] for item in basis_items)
    if dividend <= 0:
        raise RuntimeError(f"No implemented interim/annual cash dividend found for FY{basis_fiscal_year}")

    grid = [{"yield_pct": 2 + step * 0.5, "price": round(dividend / ((2 + step * 0.5) / 100), 2)} for step in range(11)]
    daily_values = [row["close_price"] for row in rows]
    weekly_values = [row["close"] for row in aggregate(rows, "week")]
    monthly_values = [row["close"] for row in aggregate(rows, "month")]
    daily_boll, weekly_boll, monthly_boll = boll(daily_values), boll(weekly_values), boll(monthly_values)

    ema12, ema26 = ema(monthly_values, 12), ema(monthly_values, 26)
    dif = [fast - slow for fast, slow in zip(ema12, ema26)]
    dea = ema(dif, 9)
    macd = dif[-1] - dea[-1]
    monthly_close = monthly_values[-1]
    sma30 = sum(monthly_values[-30:]) / min(30, len(monthly_values))
    supports = [monthly_boll["middle"], sma30]
    support_distance = min(abs(monthly_close - support) / support for support in supports)
    crossed_recently = False
    for index in range(max(1, len(monthly_values) - 7), len(monthly_values)):
        prior_window = monthly_values[max(0, index - 20):index]
        if len(prior_window) >= 20 and monthly_values[index - 1] <= sum(prior_window) / len(prior_window) < monthly_values[index]:
            crossed_recently = True
            break

    moon_conditions = {"daily_near_lower": daily_boll.get("zone") == "near-lower",
                       "weekly_near_lower": weekly_boll.get("zone") == "near-lower",
                       "monthly_near_lower": monthly_boll.get("zone") == "near-lower",
                       "monthly_macd_below_zero": dif[-1] < 0}
    dragon_conditions = {"recent_monthly_breakout": crossed_recently,
                         "within_3pct_of_support": support_distance <= 0.03,
                         "holding_support": monthly_close >= min(supports) * 0.97}
    dividend_history = []
    for year in sorted(fiscal_years):
        items = sorted(fiscal_years[year], key=lambda item: item["date"])
        dividend_history.append({"year": year, "total": round(sum(item["per_share"] for item in items), 6), "payments": items})

    return {
        "stock": {"name": NAME, "thscode": THSCODE}, "as_of": snapshot_time.isoformat(timespec="seconds"),
        "source": "同花顺金融数据服务", "price_adjustment": "none（不复权，与实时快照口径一致）",
        "snapshot": snapshot,
        "dividend": {
            "basis_year": basis_fiscal_year,
            "basis_label": f"{basis_fiscal_year} 财年中报 + 年报",
            "per_share": round(dividend, 7),
            "payments": basis_items,
            "history": dividend_history,
            "assumption": f"以 {basis_fiscal_year} 财年中报与年报合计分红作为 {snapshot_time.year} 年预期",
            "attribution_note": "按报告期归属：当年9–12月实施的分红归入当年中报，次年1–8月实施的分红归入上一财年年报。",
        },
        "grid": grid,
        "range": {"low": round(dividend / 0.06, 2), "mid": round(dividend / 0.055, 2),
                  "high": round(dividend / 0.05, 2), "current_yield_pct": round(dividend / snapshot["last_price"] * 100, 2)},
        "technicals": {"boll": {"daily": daily_boll, "weekly": weekly_boll, "monthly": monthly_boll},
                       "monthly_macd": {"dif": round(dif[-1], 4), "dea": round(dea[-1], 4),
                                        "histogram": round(macd, 4), "below_zero_axis": dif[-1] < 0},
                       "sma30_monthly": round(sma30, 2)},
        "signals": {
            "moon_dip": {"triggered": all(moon_conditions.values()), "conditions": moon_conditions,
                         "definition": "日/周/月 BOLL 均位于下轨 20% 区域，且月线 MACD 位于零轴下方"},
            "dragon_return": {"triggered": all(dragon_conditions.values()), "conditions": dragon_conditions,
                              "definition": "近6个月月线向上突破中轨，当前回踩月线中轨或30月均线±3%并守住支撑"}},
        "method_note": "策略监测信号是基于用户规则的机械化代理，不等于买卖建议。",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true", help="Refresh source data with hithink-finance CLI")
    args = parser.parse_args()
    DATA_DIR.mkdir(exist_ok=True)
    if args.fetch:
        now = datetime.now(SHANGHAI)
        start_ms = int(datetime(now.year - 5, 1, 1, tzinfo=SHANGHAI).timestamp() * 1000)
        end_ms = int(now.timestamp() * 1000)
        run_cli("market", "history", "--thscode", THSCODE, "--start-ms", str(start_ms), "--end-ms", str(end_ms),
                "--adjust", "none", "--output", str(DATA_DIR / "history.json"))
        run_cli("market", "corporate-actions", "--thscode", THSCODE, "--from-date", f"{now.year - 5}-01-01",
                "--to-date", now.strftime("%Y-%m-%d"), "--output", str(DATA_DIR / "dividends.json"))
        run_cli("market", "snapshot", "--thscodes", THSCODE, "--limit", "1", "--output", str(DATA_DIR / "snapshot.json"))
    write_json(DATA_DIR / "dashboard.json", build_payload())
    print(DATA_DIR / "dashboard.json")


if __name__ == "__main__":
    main()
