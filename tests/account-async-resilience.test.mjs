import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { assertVersionedMatch, maskCacheVersions } from "./helpers/cache-version.mjs";

const app = fs.readFileSync("js/account.js", "utf8");
const html = fs.readFileSync("account.html", "utf8");

test("account data loading has a finite timeout boundary", () => {
  assert.match(app, /withRequestTimeout/);
  assertVersionedMatch(app, /async-timeout\.js\?v=VERSION/);
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
  const matches = [...maskCacheVersions(html).matchAll(/account\.js\?v=VERSION/g)];
  assert.equal(matches.length, 1, "account module must be loaded exactly once, with a cache version");
});
