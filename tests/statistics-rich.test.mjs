import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("statistics bureau includes skill and outfit analytics", async () => {
  const [html, script] = await Promise.all([
    read("statistics.html"),
    read("js/statistics.js")
  ]);

  assert.doesNotMatch(html, /ペルソナ／キー/);
  assert.match(html, /一般技能ランキング/);
  assert.match(html, /スタイル技能ランキング/);
  assert.match(html, /アウトフィット構成/);
  assert.match(html, /本日の無意味統計/);
  assert.match(script, /from\("character_skills"\)/);
  assert.match(script, /from\("character_outfits"\)/);
  assert.match(script, /reason_value/);
  assert.match(script, /statistics-cs/);
});
