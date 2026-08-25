import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the dividend Top 10 and watchlist", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /红利股票每日筛选台/);
  assert.match(html, /今日红利 Top 10/);
  assert.match(html, /我的收藏/);
  assert.match(html, /搜索并收藏/);
  assert.match(html, /输入公司名称或股票代码/);
  assert.match(html, /class="glass-accordion favorites-accordion" open/);
  assert.match(html, /class="glass-accordion top10-accordion"/);
  assert.match(html, /华特达因/);
  assert.match(html, /☆ 收藏/);
  assert.doesNotMatch(html, /codex-preview/);
});
