"use client";

import { useEffect, useMemo, useState } from "react";
import screener from "../data/screener.json";

type Stock = { thscode: string; name: string; last_price: number; dividend_per_share: number; dividend_yield_pct: number; low_price: number; mid_price: number; high_price: number; dividend_years: number; boll_label: string; weekly_boll_label: string; monthly_boll_label: string; volatility_score: number };
const STORAGE_KEY = "dividend-grid-favorites-v2";
const DEFAULT_STOCK = "000423.SZ";
const money = (value: number) => `¥${value.toFixed(2)}`;

export default function FavoriteScreener() {
  const candidates = screener.candidates as Stock[];
  const top10 = screener.top10 as Stock[];
  const [favorites, setFavorites] = useState<string[]>([DEFAULT_STOCK]);
  const [activeCode, setActiveCode] = useState(DEFAULT_STOCK);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const codes: string[] = saved === null ? [DEFAULT_STOCK] : JSON.parse(saved);
      setFavorites(codes);
      setActiveCode(codes[0] || DEFAULT_STOCK);
    } catch { setFavorites([DEFAULT_STOCK]); }
    setReady(true);
  }, []);

  const selected = useMemo(() => candidates.filter((stock) => favorites.includes(stock.thscode)), [candidates, favorites]);
  const active = selected.find((stock) => stock.thscode === activeCode) || selected[0];
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => normalizedQuery ? candidates.filter((stock) => stock.name.toLowerCase().includes(normalizedQuery) || stock.thscode.toLowerCase().includes(normalizedQuery) || stock.thscode.slice(0, 6).includes(normalizedQuery)).slice(0, 8) : [], [candidates, normalizedQuery]);
  const grid = active ? Array.from({ length: 11 }, (_, index) => { const yieldPct = 2 + index * .5; return { yieldPct, price: active.dividend_per_share / (yieldPct / 100) }; }).reverse() : [];

  const persist = (codes: string[]) => { setFavorites(codes); localStorage.setItem(STORAGE_KEY, JSON.stringify(codes)); };
  const addFavorite = (stock: Stock) => { if (!favorites.includes(stock.thscode)) persist([...favorites, stock.thscode]); setActiveCode(stock.thscode); };
  const removeFavorite = (code: string) => { const next = favorites.filter((item) => item !== code); persist(next); if (activeCode === code) setActiveCode(next[0] || DEFAULT_STOCK); };

  return <>
    <details className="glass-accordion favorites-accordion" open>
      <summary><div><p className="section-kicker">MY WATCHLIST</p><h2>我的收藏</h2><span>{ready ? `${selected.length} 只正在监测` : "载入收藏中"}</span></div><i aria-hidden="true">⌄</i></summary>
      <div className="accordion-content">
        <div className="favorite-tabs" role="tablist" aria-label="收藏股票">
          {selected.map((stock) => <div className={active?.thscode === stock.thscode ? "favorite-tab active" : "favorite-tab"} key={stock.thscode}><button role="tab" aria-selected={active?.thscode === stock.thscode} onClick={() => setActiveCode(stock.thscode)}><b>{stock.name}</b><span>{stock.dividend_yield_pct.toFixed(2)}%</span></button><button className="tab-remove" onClick={() => removeFavorite(stock.thscode)} aria-label={`取消收藏${stock.name}`}>×</button></div>)}
          {!selected.length && <div className="empty-watchlist">还没有收藏，请从搜索或 Top 10 中添加。</div>}
        </div>
        {active && <div className="favorite-detail" role="tabpanel">
          <section className="range-strip favorite-range"><div><p className="section-kicker">{active.thscode} · {screener.basis_fiscal_year} 财年</p><h2>{active.name}</h2><p>当前 {money(active.last_price)} · 静态股息率 {active.dividend_yield_pct.toFixed(2)}% · 每股分红 {active.dividend_per_share.toFixed(4)} 元</p></div><div className="anchor-values"><div><span>6% 防守档</span><b>{money(active.low_price)}</b></div><div><span>5.5% 中枢</span><b>{money(active.mid_price)}</b></div><div><span>5% 上沿</span><b>{money(active.high_price)}</b></div><div className="yield-now"><span>当前价格</span><b>{money(active.last_price)}</b></div></div></section>
          <section className="grid-layout favorite-data-grid"><article className="panel grid-panel"><div className="panel-heading"><div><p className="section-kicker">DIVIDEND GRID</p><h2>股息率价格网格</h2></div></div><div className="grid-table">{grid.map((row) => { const near = Math.abs(active.last_price-row.price)/row.price<.025; return <div className={`grid-row ${near?"near":""}`} key={row.yieldPct}><span>{row.yieldPct.toFixed(1)}%</span><div className="track"><i style={{width:`${Math.min(100,row.price/grid[0].price*100)}%`}}/></div><b>{money(row.price)}</b><em>{near?"当前附近":active.last_price<=row.price?"已进入":"未触及"}</em></div>;})}</div></article>
            <article className="panel favorite-signals"><p className="section-kicker">DAILY CHECK</p><h2>监测摘要</h2><div className="favorite-metrics"><div><span>日线 BOLL</span><b>{active.boll_label}</b></div><div><span>周线 BOLL</span><b>{active.weekly_boll_label}</b></div><div><span>月线 BOLL</span><b>{active.monthly_boll_label}</b></div><div><span>低波动评分</span><b>{active.volatility_score.toFixed(0)} / 100</b></div><div><span>连续分红</span><b>{active.dividend_years} 个财年</b></div><div><span>价格位置</span><b>{active.last_price<active.low_price?"低于6%档":active.last_price>active.high_price?"高于5%档":"核心区间内"}</b></div></div><p className="favorite-note">BOLL通道按位置分为：靠近下轨、中部偏下、中轨附近、中部偏上、靠近上轨。日/周/月均采用20期、2倍标准差。机械监测不构成投资建议。</p></article>
          </section>
        </div>}
      </div>
    </details>
    <section className="search-panel"><div className="search-heading"><div><p className="section-kicker">SEARCH &amp; SAVE</p><h2>搜索并收藏</h2></div><span>可搜索 {screener.eligible_count.toLocaleString("zh-CN")} 只合格红利股票</span></div><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="输入公司名称或股票代码，例如：东阿阿胶 / 000423" aria-label="搜索股票名称或代码"/><button type="button" onClick={()=>setQuery("")} disabled={!query}>清除</button></label>{normalizedQuery&&<div className="search-results" aria-live="polite">{searchResults.length?searchResults.map((stock)=><article key={stock.thscode}><div><h3>{stock.name}</h3><span>{stock.thscode}</span></div><div><small>最新价</small><b>{money(stock.last_price)}</b></div><div><small>静态股息率</small><b>{stock.dividend_yield_pct.toFixed(2)}%</b></div><button className={favorites.includes(stock.thscode)?"favorite saved":"favorite"} onClick={()=>addFavorite(stock)}>{favorites.includes(stock.thscode)?"查看收藏":"☆ 收藏"}</button></article>):<p className="empty-search">合格股票池中未找到“{query}”。</p>}</div>}</section>
    <details className="glass-accordion top10-accordion"><summary><div><p className="section-kicker">DAILY SCREENER</p><h2>今日红利 Top 10</h2><span>{screener.eligible_count} 只合格股票 · {screener.basis_fiscal_year} 分红财年</span></div><i aria-hidden="true">⌄</i></summary><div className="accordion-content"><p className="top10-description">先满足连续 3 个完整财年分红，再综合静态股息率、低波动与日线 BOLL 位置排序。</p><section className="stock-list">{top10.map((stock,index)=><article className="stock-card" key={stock.thscode}><div className="rank">{String(index+1).padStart(2,"0")}</div><div className="stock-name"><h3>{stock.name}</h3><span>{stock.thscode}</span></div><div><span className="metric-label">最新价</span><b>{money(stock.last_price)}</b></div><div><span className="metric-label">财年分红</span><b>{stock.dividend_per_share.toFixed(3)} 元</b></div><div><span className="metric-label">静态股息率</span><b className="yield-value">{stock.dividend_yield_pct.toFixed(2)}%</b></div><div><span className="metric-label">5.5% 中枢</span><b>{money(stock.mid_price)}</b></div><div className="signal-mini"><span>日 {stock.boll_label}</span><span>周 {stock.weekly_boll_label}</span><span>月 {stock.monthly_boll_label}</span></div><button className={favorites.includes(stock.thscode)?"favorite saved":"favorite"} onClick={()=>addFavorite(stock)}>{favorites.includes(stock.thscode)?"查看收藏":"☆ 收藏"}</button></article>)}</section><p className="timestamp">数据日期 {screener.market_data_date} · {screener.method} 不构成投资建议。</p></div></details>
  </>;
}
