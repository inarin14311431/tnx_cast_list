import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/showcase-edit-restore.js", import.meta.url), "utf8");

test("restore UI is mounted into act profile without changing static generator markup", () => {
  assert.match(source, /id = "owned-showcase-restore"/);
  assert.match(source, /id="owned-showcase-select"/);
  assert.match(source, /id="load-owned-showcase"/);
  assert.match(source, /自分のアクト紹介を読み込む/);
  assert.match(source, /location\.assign\(url\.href\)/);
});
