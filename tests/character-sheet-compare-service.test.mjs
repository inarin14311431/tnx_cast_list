import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCharacterSheetPayload,
  normalizeCanonicalForComparison,
  loadCharacterSheetPayload
} from "../js/character-sheet-compare-service.js";

test("normalizeCharacterSheetPayload unwraps JSON data without changing field semantics", () => {
  const payload = {
    outline: "STYLE:カブキ=カタナ=ニューロ",
    player: "tester",
    jsonData: JSON.stringify({
      base: { name: "テストキャスト" },
      outfits: [{ name: "装備", concealA: "0" }]
    })
  };
  const normalized = normalizeCharacterSheetPayload(payload);
  assert.equal(normalized.base.name, "テストキャスト");
  assert.equal(normalized.outline, payload.outline);
  assert.equal(normalized.player, "tester");
  assert.equal(normalized.outfits[0].concealA, "0");
});

test("normalizeCharacterSheetPayload rejects non-object warehouse data", () => {
  assert.throws(
    () => normalizeCharacterSheetPayload("not-json"),
    /TNXキャラクターとして認識できません/
  );
});

test("comparison semantics treat concealment 0 as blank and preserve dash as an explicit value", () => {
  const zero = normalizeCanonicalForComparison({
    outfits: { "other:装備": { concealment: "0", concealment_penalty: "" } }
  });
  const blank = normalizeCanonicalForComparison({
    outfits: { "other:装備": { concealment: "", concealment_penalty: 0 } }
  });
  const dash = normalizeCanonicalForComparison({
    outfits: { "other:装備": { concealment: "ー", concealment_penalty: 0 } }
  });
  assert.deepEqual(zero.outfits["other:装備"], blank.outfits["other:装備"]);
  assert.equal(blank.outfits["other:装備"].concealment, "");
  assert.equal(blank.outfits["other:装備"].concealment_penalty, 0);
  assert.equal(dash.outfits["other:装備"].concealment, "-");
});

test("loadCharacterSheetPayload uses the shared warehouse read URL and supports an injected request", async () => {
  const calls = [];
  const sourceUrl = "https://character-sheets.appspot.com/tnx/edit.html?key=abc_123";
  const result = await loadCharacterSheetPayload(sourceUrl, {
    request: async url => {
      calls.push(url);
      return { jsonData: JSON.stringify({ base: { name: "取得成功" } }) };
    }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0], "https://character-sheets.appspot.com/tnx/display?ajax=1&key=abc_123");
  assert.equal(result.base.name, "取得成功");
});

test("loadCharacterSheetPayload retries compatible warehouse endpoints", async () => {
  const calls = [];
  const sourceUrl = "https://character-sheets.appspot.com/tnx/edit.html?key=retry_key";
  const result = await loadCharacterSheetPayload(sourceUrl, {
    request: async url => {
      calls.push(url);
      if (calls.length < 3) throw new Error("temporary failure");
      return { base: { name: "再試行成功" } };
    }
  });
  assert.equal(calls.length, 3);
  assert.equal(result.base.name, "再試行成功");
  assert.match(calls[1], /display\.html\?ajax=1&key=retry_key/);
  assert.match(calls[2], /display\?key=retry_key&ajax=1/);
});