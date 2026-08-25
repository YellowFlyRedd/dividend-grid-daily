import dashboard from "../data/dashboard.json";
import FavoriteScreener from "./FavoriteScreener";

const money = (value: number) => `¥${value.toFixed(2)}`;
const labels: Record<string, string> = {
  daily_near_lower: "日线靠近 BOLL 下轨", weekly_near_lower: "周线靠近 BOLL 下轨",
  monthly_near_lower: "月线靠近 BOLL 下轨", monthly_macd_below_zero: "月线 MACD 在零轴下",
  recent_monthly_breakout: "近6月曾突破月线中轨", within_3pct_of_support: "距支撑位不超过3%", holding_support: "当前仍守住支撑",
};

function Status({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={active ? "status active" : "status quiet"}>{children}</span>;
}

export default function Home() {
  const { snapshot, dividend, range, technicals, signals } = dashboard;
  const grid = dashboard.grid.slice().reverse();
  const lastPrice = snapshot.last_price;
  return (
    <main>
      <header className="hero">
        <div><p className="eyebrow">LOW VOLATILITY · DIVIDEND GRID</p><h1>红利股票<br />每日筛选台</h1><p className="lede">每天从全市场筛选 Top 10，用收藏建立自己的监测清单；用分红定锚，用网格保持纪律。</p></div>
        <div className="quote-card">
          <div className="quote-top"><div><p className="muted">{dashboard.stock.name}</p><p className="code">{dashboard.stock.thscode}</p></div><Status active={snapshot.price_change >= 0}>{snapshot.price_change_ratio_pct >= 0 ? "+" : ""}{snapshot.price_change_ratio_pct.toFixed(2)}%</Status></div>
          <p className="price">{money(lastPrice)}</p>
          <div className="quote-stats"><span>今开 <b>{snapshot.open_price.toFixed(2)}</b></span><span>最高 <b>{snapshot.high_price.toFixed(2)}</b></span><span>最低 <b>{snapshot.low_price.toFixed(2)}</b></span></div>
          <p className="timestamp">更新于 {new Date(dashboard.as_of).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</p>
        </div>
      </header>
      <FavoriteScreener>
      <div className="detail-divider"><span>收藏示例 · 东阿阿胶详细监测</span></div>
      <section className="range-strip">
        <div><p className="section-kicker">你的估值锚</p><h2>{money(range.low)} — {money(range.high)}</h2><p>{dividend.assumption}，每股现金分红 {dividend.per_share.toFixed(4)} 元。</p></div>
        <div className="anchor-values"><div><span>6% 防守档</span><b>{money(range.low)}</b></div><div><span>5.5% 中枢</span><b>{money(range.mid)}</b></div><div><span>5% 上沿</span><b>{money(range.high)}</b></div><div className="yield-now"><span>当前静态股息率</span><b>{range.current_yield_pct.toFixed(2)}%</b></div></div>
      </section>
      <section className="grid-layout">
        <article className="panel grid-panel"><div className="panel-heading"><div><p className="section-kicker">撒网</p><h2>股息率价格网格</h2></div><span className="legend-dot">当前价 {money(lastPrice)}</span></div>
          <div className="grid-table">{grid.map((row) => { const crossed = lastPrice <= row.price; const near = Math.abs(lastPrice-row.price)/row.price < .025; return <div className={`grid-row ${near ? "near" : ""}`} key={row.yield_pct}><span>{row.yield_pct.toFixed(1)}%</span><div className="track"><i style={{width:`${Math.min(100,row.price/grid[0].price*100)}%`}} /></div><b>{money(row.price)}</b><em>{near ? "当前附近" : crossed ? "已进入" : "未触及"}</em></div>; })}</div>
        </article>
        <article className="panel signal-panel"><div className="panel-heading"><div><p className="section-kicker">信号</p><h2>技术面共振</h2></div></div>
          <div className="signal-card"><div><h3>月下吸</h3><p>{signals.moon_dip.definition}</p></div><Status active={signals.moon_dip.triggered}>{signals.moon_dip.triggered ? "条件齐备" : "未触发"}</Status></div>
          <div className="condition-list">{Object.entries(signals.moon_dip.conditions).map(([key,value])=><p key={key}><i className={value ? "ok":"no"}/>{labels[key]}</p>)}</div>
          <div className="signal-card dragon"><div><h3>龙回头</h3><p>{signals.dragon_return.definition}</p></div><Status active={signals.dragon_return.triggered}>{signals.dragon_return.triggered ? "条件齐备" : "未触发"}</Status></div>
          <div className="condition-list">{Object.entries(signals.dragon_return.conditions).map(([key,value])=><p key={key}><i className={value ? "ok":"no"}/>{labels[key]}</p>)}</div>
        </article>
      </section>
      <section className="panel indicator-panel"><div className="panel-heading"><div><p className="section-kicker">三周期确认</p><h2>BOLL 与月线 MACD</h2></div><span className="method">20期 · 2σ · 不复权</span></div>
        <div className="indicator-grid">{Object.entries(technicals.boll).map(([period,item])=><div className="indicator" key={period}><p>{period==="daily"?"日线":period==="weekly"?"周线":"月线"}</p><h3>{item.label}</h3><div className="band"><i style={{left:`${Math.max(0,Math.min(100,item.position*100))}%`}}/></div><div className="band-values"><span>{item.lower.toFixed(2)}</span><span>{item.middle.toFixed(2)}</span><span>{item.upper.toFixed(2)}</span></div></div>)}
          <div className="indicator macd"><p>月线 MACD</p><h3>{technicals.monthly_macd.below_zero_axis?"零轴下方":"零轴上方"}</h3><div className="macd-row"><span>DIF {technicals.monthly_macd.dif.toFixed(3)}</span><span>DEA {technicals.monthly_macd.dea.toFixed(3)}</span></div><small>柱值 {technicals.monthly_macd.histogram.toFixed(3)} · 30月均线 {technicals.sma30_monthly.toFixed(2)}</small></div>
        </div>
      </section>
      <section className="selection-grid"><div><p>公司背景</p><h3>待验证</h3><span>当前数据源未提供央企/国企控股字段，不做猜测。</span></div><div><p>分红口径</p><h3>按财年</h3><span>同一财年的中报与年报合并，不按除权日自然年汇总。</span></div><div className="verified"><p>持续分红</p><h3>{dividend.history.length} 个财年</h3><span>{dividend.attribution_note}</span></div></section>
      <section className="bottom-grid"><article className="panel"><p className="section-kicker">下蛋记录</p><h2>现金分红轨迹</h2><div className="dividend-bars">{dividend.history.map(year=><div key={year.year}><span>{year.year}</span><i style={{width:`${Math.min(100,year.total/3*100)}%`}}/><b>{year.total.toFixed(3)} 元</b></div>)}</div></article>
        <article className="panel discipline"><p className="section-kicker">收网纪律</p><h2>仓位检查清单</h2><ul><li><b>分散</b><span>跨行业配置，避免单一板块集中。</span></li><li><b>留现金</b><span>永不满仓，保留应对波动的缓冲。</span></li><li><b>留底仓</b><span>减仓后保留 10%–20%，继续参与分红。</span></li><li><b>减仓观察</b><span>股息率降至 3%–3.5% 时分批评估。</span></li></ul></article>
      </section>
      </FavoriteScreener>
      <footer><p>{dashboard.method_note} 假设未来分红与上一完整财年的中报及年报合计相同，未考虑利润变化、特别分红、税费及市场风险。</p><p>数据源：{dashboard.source} · 行情口径：{dashboard.price_adjustment} · 不构成投资建议</p></footer>
    </main>
  );
}
