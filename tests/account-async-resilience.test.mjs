import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const app = fs.readFileSync("js/account.js", "utf8");
const html = fs.readFileSync("account.html", "utf8");

test("account data loading has a finite timeout boundary", () => {
  assert.match(app, /withRequestTimeout/);
  assert.match(app, /async-timeout\.js\?v=1/);
  assert.match(app, /キャスト情報の取得がタイムアウトしました/);
});

test("account destructive writes restore their buttons", () => {
  assert.match(app, /async function runAccountWrite\(/);
  assert.match(app, /button\.disabled = true/);
  assert.match(app, /finally\s*\{/);
  assert.match(app, /button\.disabled = false/);
});

test("uncertain write completion is not automatically retried", () => {
  assert.match(app, /処理結果を確認できませんでした/);
  assert.match(app, /再実行する前に登録キャスト一覧を確認してください/);
  assert.doesNotMatch(app, /retryWrite|retryDelete|retryDuplicate|setInterval/);
});

test("account page keeps an explicit cache boundary for the account module", () => {
  const matches = [...html.matchAll(/account\.js\?v=(\d+)/g)];
  assert.equal(matches.length, 1, "account module must be loaded exactly once");
  assert.ok(Number(matches[0][1]) >= 1, "account module must use a numeric cache version");
});
