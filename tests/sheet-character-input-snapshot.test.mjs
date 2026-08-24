import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  collectCharacterInputSnapshot,
  applyCharacterInputSnapshot
} from "../js/sheet-character-input-snapshot.js";

function fakeRoot(values = {}, texts = {}) {
  const controls = new Map(
    Object.entries(values).map(([selector, value]) => [selector, { value }])
  );
  return {
    controls,
    querySelector(selector) {
      if (controls.has(selector)) return controls.get(selector);
      if (Object.hasOwn(texts, selector)) return { textContent: texts[selector] };
      return null;
    }
  };
}

test("character input snapshot preserves base and structured field mappings", () => {
  const snapshot = collectCharacterInputSnapshot({
    root: fakeRoot({
      "#character-name": "テストキャスト",
      "#character-kana": "テスト",
      "#handle": "HANDLE",
      "#player-name": "PLAYER",
      "#affiliation": "千早重工",
      "#citizen-rank": "B",
      "#summary": "summary",
      "#profile": "profile",
      "#visibility": "public",
      "#age": "24",
      "#gender": "X"
    }),
    structuredFields: [["age", "#age"], ["gender", "#gender"]],
    experienceTotal: 18
  });

  assert.deepEqual(snapshot.base, {
    character_name: "テストキャスト",
    character_kana: "テスト",
    handle: "HANDLE",
    player_name: "PLAYER",
    affiliation: "千早重工",
    citizen_rank: "B",
    summary: "summary",
    profile: "profile",
    visibility: "public",
    experience_points: 18
  });
  assert.deepEqual(snapshot.structured, { age: "24", gender: "X" });
});

test("missing controls fall back to empty strings", () => {
  const snapshot = collectCharacterInputSnapshot({
    root: fakeRoot(),
    structuredFields: [["age", "#age"]],
    experienceTotal: 0
  });
  assert.equal(snapshot.base.character_name, "");
  assert.equal(snapshot.base.experience_points, 0);
  assert.deepEqual(snapshot.structured, { age: "" });
});

test("character input application restores base structured and visibility fields", () => {
  const root = fakeRoot({
    "#character-name": "",
    "#character-kana": "",
    "#handle": "",
    "#player-name": "",
    "#affiliation": "",
    "#citizen-rank": "",
    "#summary": "",
    "#profile": "",
    "#visibility": "private",
    "#age": "",
    "#gender": ""
  });

  applyCharacterInputSnapshot({
    root,
    data: {
      character_name: "ロードキャスト",
      character_kana: "ロード",
      handle: "LOADED",
      player_name: "PLAYER",
      affiliation: "千早重工",
      citizen_rank: "A",
      summary: "summary",
      profile: "profile",
      visibility: "public",
      age: "31",
      gender: "X"
    },
    structuredFields: [["age", "#age"], ["gender", "#gender"]]
  });

  assert.equal(root.controls.get("#character-name").value, "ロードキャスト");
  assert.equal(root.controls.get("#age").value, "31");
  assert.equal(root.controls.get("#visibility").value, "public");
});

test("non-public visibility restores as private", () => {
  const root = fakeRoot({ "#visibility": "public" });
  applyCharacterInputSnapshot({ root, data: { visibility: "friends" } });
  assert.equal(root.controls.get("#visibility").value, "private");
});

test("classic sheet delegates profile DOM collection and application to snapshot module", async () => {
  const source = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
  assert.match(source, /sheet-character-input-snapshot\.js\?v=1/);
  assert.match(source, /collectCharacterInputSnapshot/);
  assert.match(source, /applyCharacterInputSnapshot/);
  assert.doesNotMatch(source, /\["character_name", "character_kana", "handle", "player_name"/);
});
