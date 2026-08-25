export default function StrategyGuide() {
  return <details className="glass-accordion strategy-guide" open>
    <summary><div><p className="section-kicker">METHOD &amp; PLAYBOOK</p><h2>策略原理与操作指引</h2><span>从分红基数、价格网格到日周月 BOLL 的完整观察流程</span></div><i aria-hidden="true">⌄</i></summary>
    <div className="accordion-content strategy-content">
      <section className="strategy-intro">
        <div><p className="strategy-number">01</p><h3>先用分红给价格定锚</h3><p>以上一完整财年的中报与年报税前每股现金分红合计 <b>D</b>，作为本年度预期分红。目标股息率为 <b>y</b> 时，对应价格为 <b>P = D ÷ y</b>。</p></div>
        <div className="formula-card"><span>核心观察区间</span><b>6%档 → 5.5%中枢 → 5%档</b><p>股价下跌时静态股息率上升；股价上涨时静态股息率下降。区间是估值尺，不是价格预测。</p></div>
      </section>
      <section className="strategy-grid">
        <article><p className="strategy-number">02</p><h3>先筛“持续下蛋”的公司</h3><ul><li>至少连续3个完整财年实施现金分红</li><li>优先观察经营稳健、行业地位清晰的公司</li><li>排除流动性过低和分红记录断续的标的</li><li>特别分红、利润变化与回购需另行核对</li></ul></article>
        <article><p className="strategy-number">03</p><h3>BOLL 五档位置</h3><div className="boll-scale"><span>靠近下轨<small>0–20%</small></span><span>中部偏下<small>20–40%</small></span><span>中轨附近<small>40–60%</small></span><span>中部偏上<small>60–80%</small></span><span>靠近上轨<small>80–100%</small></span></div><p>日、周、月均使用20期、2倍总体标准差。月线看大位置，周线看中期节奏，日线看短期状态。</p></article>
      </section>
      <section className="daily-playbook"><div className="playbook-heading"><p className="strategy-number">04</p><div><h3>每天收盘后的查看顺序</h3><p>建议按下面顺序阅读，避免只看单一指标。</p></div></div><ol>
        <li><b>确认数据</b><span>检查市场数据日期，以及采用的分红财年和中报、年报合计。</span></li>
        <li><b>看价格网格</b><span>判断当前价处于6%、5.5%、5%哪两个档位之间，并查看静态股息率。</span></li>
        <li><b>先月后周再日</b><span>月线确认长期位置，周线判断是否向下或企稳，日线用于观察短期靠近哪一侧。</span></li>
        <li><b>检查共振</b><span>日、周、月越一致，信号越集中；周期互相矛盾时标记为继续观察。</span></li>
        <li><b>复核基本面</b><span>财报、分红政策或利润出现明显变化时，旧分红基数需要重新评估。</span></li>
      </ol></section>
      <section className="discipline-strip"><div><b>分散</b><span>跨行业观察，避免单一公司风险集中</span></div><div><b>留现金</b><span>不满仓，为波动和新机会保留余地</span></div><div><b>留底仓</b><span>若自行减仓，可按个人规则保留10%–20%观察仓</span></div><div><b>守纪律</b><span>先写规则再行动，不因短期涨跌临时改变口径</span></div></section>
      <p className="strategy-disclaimer">本策略把历史分红机械地映射为价格网格，未考虑未来利润、分红削减、税费、估值变化和市场风险。网页只提供观察与记录工具，不构成荐股、收益承诺或买卖指令。</p>
    </div>
  </details>;
}
