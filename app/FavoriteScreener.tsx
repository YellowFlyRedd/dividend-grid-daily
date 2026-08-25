"use client";

import { useEffect, useMemo, useState } from "react";
import screener from "../data/screener.json";

type Stock = { thscode: string; name: string; last_price: number; dividend_per_share: number; dividend_yield_pct: number; mid_price: number; boll_label: string; volatility_score: number };
const STORAGE_KEY = "dividend-grid-favorites-v1";
const money = (value: number) => `¥${value.toFixed(2)}`;

export default function FavoriteScreener() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { setFavorites([]); }
    setReady(true);
  }, []);

  const toggle = (code: string) => {
    const next = favorites.includes(code) ? favorites.filter((item) => item !== code) : [...favorites, code];
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const stocks = screener.top10 as Stock[];
  const candidates = screener.candidates as Stock[];
  const selected = useMemo(() => candidates.filter((stock) => favorites.includes(stock.thscode)), [favorites, candidates]);
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => normalizedQuery ? candidates.filter((stock) => stock.name.toLowerCase().includes(normalizedQuery) || stock.thscode.toLowerCase().includes(normalizedQuery) || stock.thscode.slice(0, 6).includes(normalizedQuery)).slice(0, 8) : [], [candidates, normalizedQuery]);

  return <>
    <section className="screener-intro">
      <div><p className="section-kicker">DAILY SCREENER</p><h2>今日红利 Top 10</h2><p>先满足连续 3 个完整财年分红，再综合静态股息率、低波动与日线 BOLL 位置排序。</p></div>
      <div className="screener-meta"><b>{screener.eligible_count}</b><span>只合格股票</span><b>{screener.basis_fiscal_year}</b><span>分红财年</span></div>
    </section>
    <section className="stock-list" aria-label="今日红利股票 Top 10">
      {stocks.map((stock: Stock, index) => <article className="stock-card" key={stock.thscode}>
        <div className="rank">{String(index + 1).padStart(2, "0")}</div>
        <div className="stock-name"><h3>{stock.name}</h3><span>{stock.thscode}</span></div>
        <div><span className="metric-label">最新价</span><b>{money(stock.last_price)}</b></div>
        <div><span className="metric-label">财年分红</span><b>{stock.dividend_per_share.toFixed(3)} 元</b></div>
        <div><span className="metric-label">静态股息率</span><b className="yield-value">{stock.dividend_yield_pct.toFixed(2)}%</b></div>
        <div><span className="metric-label">5.5% 中枢</span><b>{money(stock.mid_price)}</b></div>
        <div className="signal-mini"><span>{stock.boll_label}</span><span>低波动 {stock.volatility_score.toFixed(0)}</span></div>
        <button className={favorites.includes(stock.thscode) ? "favorite saved" : "favorite"} onClick={() => toggle(stock.thscode)} aria-label={`${favorites.includes(stock.thscode) ? "取消收藏" : "收藏"}${stock.name}`} aria-pressed={favorites.includes(stock.thscode)}>{favorites.includes(stock.thscode) ? "★ 已收藏" : "☆ 收藏"}</button>
      </article>)}
    </section>
    <p className="timestamp">数据日期 {screener.market_data_date} · 全市场 {screener.universe_count.toLocaleString("zh-CN")} 只 · {screener.method} 机械排序仅用于观察，不构成投资建议。</p>
    <section className="search-panel">
      <div className="search-heading"><div><p className="section-kicker">SEARCH &amp; SAVE</p><h2>搜索并收藏</h2></div><span>可搜索 {screener.eligible_count.toLocaleString("zh-CN")} 只合格红利股票</span></div>
      <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入公司名称或股票代码，例如：东阿阿胶 / 000423" aria-label="搜索股票名称或代码"/><button type="button" onClick={() => setQuery("")} disabled={!query}>清除</button></label>
      {normalizedQuery && <div className="search-results" aria-live="polite">
        {searchResults.length ? searchResults.map((stock) => <article key={stock.thscode}>
          <div><h3>{stock.name}</h3><span>{stock.thscode}</span></div><div><small>最新价</small><b>{money(stock.last_price)}</b></div><div><small>静态股息率</small><b>{stock.dividend_yield_pct.toFixed(2)}%</b></div><button className={favorites.includes(stock.thscode) ? "favorite saved" : "favorite"} onClick={() => toggle(stock.thscode)}>{favorites.includes(stock.thscode) ? "★ 已收藏" : "☆ 收藏"}</button>
        </article>) : <p className="empty-search">合格股票池中未找到“{query}”。</p>}
      </div>}
    </section>
    <section className="watchlist-panel">
      <div><p className="section-kicker">MY WATCHLIST</p><h2>我的每日监测</h2><p>{ready && selected.length ? `已收藏 ${selected.length} 只；收藏保存在这台设备的浏览器中。` : "点击 Top 10 右侧的收藏按钮，建立你的每日监测清单。"}</p></div>
      <div className="watchlist-chips">{selected.map((stock: Stock) => <button key={stock.thscode} onClick={() => toggle(stock.thscode)}><b>{stock.name} · {money(stock.last_price)}</b><span>股息率 {stock.dividend_yield_pct.toFixed(2)}% · 区间 {money(stock.dividend_per_share/.06)}–{money(stock.dividend_per_share/.05)} · 点击移除</span></button>)}</div>
    </section>
  </>;
}
