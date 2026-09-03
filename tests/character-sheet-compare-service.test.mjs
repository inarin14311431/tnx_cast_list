import test from "node:test";
import assert from "node:assert/strict";

import {
  compareCharacterSheetPayload,
  normalizeCharacterSheetPayload,
  normalizeCanonicalForComparison,
  loadCharacterSheetPayload,
  preserveWarehouseLifePathRawText
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

test("warehouse life path comparison keeps the original text including acquired skills", () => {
  const rawOrigin = "企業の子（社会：企業）";
  const rawExperience = "戦場帰り（白兵）";
  const rawEncounter = "好敵手（コネ：アルファ）";
  const payload = {
    base: {
      lifepath: {
        origin: "企業の子",
        experience: rawOrigin,
        environment: rawExperience,
        encounter: rawEncounter
      }
    }
  };

  const normalized = preserveWarehouseLifePathRawText(payload);
  assert.equal(normalized.base.lifepath.origin, rawOrigin);
  assert.equal(normalized.base.lifepath.environment, rawExperience);
  assert.equal(normalized.base.lifepath.encounter, rawEncounter);
  assert.equal(payload.base.lifepath.origin, "企業の子");
});

test("warehouse life path comparison falls back to legacy origin when the current source field is empty", () => {
  const payload = {
    base: {
      lifepath: {
        origin: "旧形式の出自（社会：ストリート）",
        experience: "",
        environment: "経験原文",
        encouter: "邂逅原文"
      }
    }
  };
  const normalized = preserveWarehouseLifePathRawText(payload);
  assert.equal(normalized.base.lifepath.origin, "旧形式の出自（社会：ストリート）");
  assert.equal(normalized.base.lifepath.encounter, "邂逅原文");
});

test("life path source text with acquired skills produces zero differences after import-style storage", () => {
  const rawOrigin = "企業の子（社会：企業）";
  const rawExperience = "戦場帰り（白兵）";
  const rawEncounter = "好敵手（コネ：アルファ）";
  const archiveBundle = {
    character: {
      life_path_origin: rawOrigin,
      life_path_experience: rawExperience,
      life_path_encounter: rawEncounter,
      reason_base: 0,
      reason_gear: 0,
      reason_control_base: 0,
      reason_control_gear: 0,
      passion_base: 0,
      passion_gear: 0,
      passion_control_base: 0,
      passion_control_gear: 0,
      life_base: 0,
      life_gear: 0,
      life_control_base: 0,
      life_control_gear: 0,
      mundane_base: 0,
      mundane_gear: 0,
      mundane_control_base: 0,
      mundane_control_gear: 0,
      cs_base: 0,
      cs_gear: 0
    },
    skills: [],
    outfits: []
  };
  const externalPayload = {
    base: {
      lifepath: {
        origin: "企業の子",
        experience: rawOrigin,
        environment: rawExperience,
        encounter: rawEncounter
      }
    }
  };

  assert.deepEqual(compareCharacterSheetPayload(archiveBundle, externalPayload), []);
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
