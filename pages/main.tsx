import React from "react";
import { createRoot } from "react-dom/client";
import FavoriteScreener from "../app/FavoriteScreener";
import StrategyGuide from "../app/StrategyGuide";
import screener from "../data/screener.json";
import "../app/globals.css";
import "../app/selection.css";
import "../app/screener.css";
import "../app/search.css";
import "../app/glass.css";
import "../app/tabs.css";
import "../app/strategy-guide.css";
import "../app/title-refinement.css";
import "../app/favorite-opportunities.css";

function App() {
  return <main>
    <header className="hero">
      <div>
        <p className="eyebrow">LOW VOLATILITY · DIVIDEND GRID</p>
        <h1>红利股票<br/>每日筛选台</h1>
        <p className="lede">收藏即选项卡。点击不同股票，在同一个观察台切换它的分红估值、股息率网格与每日监测数据。</p>
      </div>
      <div className="quote-card market-summary">
        <p className="section-kicker">MARKET COVERAGE</p>
        <div>
          <span><b>{screener.universe_count.toLocaleString("zh-CN")}</b>全市场股票</span>
          <span><b>{screener.eligible_count.toLocaleString("zh-CN")}</b>合格红利股票</span>
          <span><b>{screener.basis_fiscal_year}</b>分红基准财年</span>
        </div>
        <p className="timestamp">市场数据日期 {screener.market_data_date}</p>
      </div>
    </header>
    <FavoriteScreener />
    <StrategyGuide />
    <footer>
      <p>所有价格区间基于上一完整财年中报与年报合计分红。公司行动报告期使用网页注明的代理归属规则。</p>
      <p>数据源：同花顺金融数据服务 · 机械筛选与监测不构成投资建议</p>
    </footer>
  </main>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
