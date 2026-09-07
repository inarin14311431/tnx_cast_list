import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GENERAL_MASTER_ROWS } from "../js/general-skill-catalog.js";
import { buildMobileNewCharacterSkillPayloads } from "../js/sheet-mobile-new-character-state.js";

const SUITS = ["reason", "passion", "life", "mundane"];

test("mobile new character persists the same automatically acquired general skills as PC", () => {
  const rows = buildMobileNewCharacterSkillPayloads("character-1");
  const general = rows.filter(row => row.category === "general" && row.skill_kind === "general");
  const expected = GENERAL_MASTER_ROWS.filter(([, , kind]) => kind === "general");

  assert.equal(general.length, expected.length);
  for (const [name, suit] of expected) {
    const row = general.find(item => item.name === name);
    assert.ok(row, `${name} should be present`);
    assert.equal(row.character_id, "character-1");
    assert.equal(row.level, 1);
    assert.equal(row.skill_kind, "general");
    for (const candidate of SUITS) assert.equal(row[candidate], candidate === suit);
  }
});

test("mobile new character preserves the PC proper-skill starter slots", () => {
  const rows = buildMobileNewCharacterSkillPayloads("character-1");
  const proper = rows.filter(row => row.category === "general" && row.skill_kind === "proper");

  assert.deepEqual(proper.map(row => row.name), ["製作：", "芸術：", "操縦："]);
  for (const row of proper) {
    assert.equal(row.character_id, "character-1");
    assert.equal(row.level, 0);
    assert.equal(row.free_level, 0);
    for (const suit of SUITS) assert.equal(row[suit], false);
  }
});

test("mobile new character preserves the PC starter social and connection rows", () => {
  const rows = buildMobileNewCharacterSkillPayloads("character-1");
  assert.deepEqual(
    rows.filter(row => row.category === "social").map(row => row.name),
    ["社会：N◎VA", "社会：", "社会：", "社会："]
  );
  assert.deepEqual(
    rows.filter(row => row.category === "connection").map(row => row.name),
    ["コネ：", "コネ：", "コネ："]
  );
  assert.ok(rows.every(row => row.character_id === "character-1"));
});

test("mobile new flow is wired to the shared PC initialization and save projection", async () => {
  const helper = await readFile(new URL("../js/sheet-mobile-new-character-state.js", import.meta.url), "utf8");
  const entry = await readFile(new URL("../js/sheet-mobile-new.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../sheet-mobile-new.html", import.meta.url), "utf8");

  assert.match(helper, /buildNewCharacterSkills/);
  assert.match(helper, /buildSkillSavePayloads/);
  assert.match(helper, /PROPER_MASTER_NAMES/);
  assert.match(entry, /buildMobileNewCharacterSkillPayloads\(data\.id\)/);
  assert.match(entry, /\.select\("id,public_id"\)/);
  assert.match(entry, /character_skills/);
  assert.match(html, /sheet-mobile-new\.js\?v=2/);
});
