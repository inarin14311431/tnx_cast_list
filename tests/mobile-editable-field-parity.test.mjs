import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile profile covers every PC editable character/profile field", async () => {
  const mobile = await read("js/sheet-mobile.js");
  const personal = await read("js/sheet-personal-data.js");
  const snapshot = await read("js/sheet-character-input-snapshot.js");

  for (const field of [
    "character_name", "character_kana", "handle", "handle_kana", "player_name",
    "affiliation", "citizen_rank", "birthplace", "visibility",
    "age", "gender", "height", "weight", "eyes", "hair", "skin",
    "life_path_origin", "life_path_experience", "life_path_encounter",
    "summary", "profile"
  ]) {
    assert.match(mobile, new RegExp(`\\b${field}\\b`), `mobile profile must support ${field}`);
  }

  for (const field of ["handle_kana", "age", "gender", "height", "weight", "eyes", "hair", "skin", "life_path_origin", "life_path_experience", "life_path_encounter"]) {
    assert.match(personal, new RegExp(`\\b${field}\\b`));
  }
  for (const field of ["character_name", "character_kana", "handle", "player_name", "affiliation", "citizen_rank", "summary", "profile"]) {
    assert.match(snapshot, new RegExp(`\\b${field}\\b`));
  }
});

test("mobile outfit editor exposes public-view common outfit fields", async () => {
  const view = await read("js/cast-view-definitions.js");
  const mobileUi = await read("js/sheet-mobile-outfit-ui.js");
  const mobileModel = await read("js/sheet-mobile-outfit-model.js");

  assert.match(view, /\bpage_number\b/);
  assert.match(mobileUi, /\bpage_number\b/);
  assert.match(mobileModel, /\bpage_number\b/);

  assert.match(view, /\bconcealment_penalty\b/);
  assert.match(mobileUi, /data-outfit-transient="conceal-mod"/, "mobile editor exposes concealment modifier through its transient control");
  assert.match(mobileModel, /concealment_penalty:\s*String\(item\._concealMod/,
    "mobile outfit model persists transient concealment modifier into canonical concealment_penalty");

  assert.doesNotMatch(view, /\bmanufacturer\b/, "manufacturer is metadata, not a public-view field");
  assert.doesNotMatch(mobileUi, /data-outfit-detail=["']manufacturer["']/, "mobile editor should not expose view-unused manufacturer metadata");
  assert.match(mobileModel, /\bmanufacturer\b/, "mobile outfit model must still preserve imported manufacturer metadata");
});

test("mobile outfit editor keeps category-specific public-view fields", async () => {
  const view = await read("js/cast-view-definitions.js");
  const mobileUi = await read("js/sheet-mobile-outfit-ui.js");
  const mobileModel = await read("js/sheet-mobile-outfit-model.js");

  for (const field of [
    "parry", "speed", "electronic_control",
    "ianus_surface", "ianus_deep", "ianus_none",
    "tron_software", "tron_support", "tron_hardware",
    "crew", "sf", "residence_entry", "residence_electric", "residence_area"
  ]) {
    assert.match(view, new RegExp(`\\b${field === "residence_electric" || field === "residence_area" ? "residence_electric_area" : field}\\b`), `cast view must expose ${field}`);
    assert.match(mobileUi, new RegExp(`\\b${field}\\b`), `mobile outfit editor must expose ${field}`);
  }

  for (const [field, transient] of [["defense_s", "def-s"], ["defense_p", "def-p"], ["defense_i", "def-i"]]) {
    assert.match(view, new RegExp(`\\b${field}\\b`), `cast view must expose ${field}`);
    assert.match(mobileUi, new RegExp(`data-outfit-transient=["']${transient}["']`), `mobile editor must expose ${field} through ${transient}`);
    assert.match(mobileModel, new RegExp(`${field}:\\s*String\\(item\\._def${field.at(-1).toUpperCase()}`), `mobile model must persist ${field} canonically`);
  }
});
