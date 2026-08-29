import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountLinks = await readFile(new URL("../js/account-mobile-editor-links.js", import.meta.url), "utf8");
const accountActionCss = await readFile(new URL("../css-next/pages/account-actions.css", import.meta.url), "utf8");
const accountIcons = await readFile(new URL("../js/account-action-icons.js", import.meta.url), "utf8");
const troopSave = await readFile(new URL("../js/troop-save.js", import.meta.url), "utf8");
const troopHtml = await readFile(new URL("../troop.html", import.meta.url), "utf8");
const troopComboRules = await readFile(new URL("../js/troop-combo-rule-v2.js", import.meta.url), "utf8");
const troopComboCodec = await readFile(new URL("../js/troop-combo-codec.js", import.meta.url), "utf8");

test("account keeps acts visible and only adds troop shortcut for linked casts", () => {
  assert.match(accountLinks, /\.from\("troops"\).*\.not\("character_id", "is", null\)/s);
  assert.match(accountLinks, /linkedTroops\.get\(publicId\)/);
  assert.match(accountLinks, /Boolean\(troopInfo\?\.count\)/);
  assert.match(accountLinks, /if \(!linked\) \{\s*existing\?\.remove\(\)/s);
  assert.match(accountLinks, /owned-cast__acts/);
  assert.match(accountLinks, /owned-cast__troops/);
  assert.match(accountActionCss, /owned-cast__management:not\(\.owned-cast__management--with-troop\).*owned-cast__acts/s);
  assert.match(accountActionCss, /grid-column: 1 \/ 3/);
});

test("linked troop shortcut has its own icon and EXP is aggregated into cast breakdown", () => {
  assert.match(accountIcons, /troop:/);
  assert.match(accountIcons, /data-cast-troops-link/);
  assert.match(accountLinks, /select\("character_id, experience_spent"\)/);
  assert.match(accountLinks, /current\.experience \+= Number\(troop\.experience_spent\) \|\| 0/);
  assert.match(accountLinks, /消費 \$\{castExp\}＋\$\{troopInfo\.experience\} EXP/);
});

test("troop page uses one canonical guarded save controller", () => {
  assert.match(troopHtml, /troop\.js\?v=6/);
  assert.doesNotMatch(troopHtml, /troop-save-v2\.js/);
  assert.match(troopSave, /export function registerTroopSave/);
  assert.match(troopSave, /dataset\.troopSaveHandler === "canonical"/);
  assert.match(troopSave, /addEventListener\("submit", saveTroop\)/);
  assert.doesNotMatch(troopSave, /stopImmediatePropagation|addEventListener\("submit"[^\n]*true\)/);
  assert.match(troopSave, /if \(saving\) return/);
  assert.match(troopSave, /saveButton\.disabled = active/);
  assert.match(troopSave, /let publicId =/);
  assert.match(troopSave, /history\.replaceState\(null, "", target\.href\)/);
  assert.match(troopSave, /target\.searchParams\.set\("edit", "1"\)/);
  assert.match(troopSave, /setSavingState\(false\)/);
  assert.doesNotMatch(troopSave, /location\.(?:replace|href\s*=)/);
  assert.match(troopSave, /\.update\(payload\)\.eq\("public_id", publicId\)\.eq\("owner_id", user\.id\)/);
  assert.match(troopSave, /\.insert\(payload\)/);
});

test("troop save persists current editor collections and disables legacy use limit", () => {
  assert.match(troopSave, /skills: \[\.\.\.generalSkills, \.\.\.styleSkills\]/);
  assert.match(troopSave, /combos: collectCombos\(\)/);
  assert.match(troopSave, /outfits: collectRows\("#troop-outfits-editor"/);
  assert.match(troopSave, /act_use_limit: null/);
  assert.match(troopSave, /experience_spent:/);
});

test("troop style skill metadata persists timing and confrontation without an EXP editor field", () => {
  assert.match(troopSave, /timing: category === "style" \? rowValue\(row, "timing"\) : ""/);
  assert.match(troopSave, /confrontation: category === "style" \? rowValue\(row, "confrontation"\) : ""/);
  assert.doesNotMatch(troopHtml, /スタイル技能[\s\S]*?EXP[^<]*<\/span>/);
});

test("troop combo uses expected value while keeping legacy target_value storage compatible", () => {
  assert.match(troopHtml, /達成値目安/);
  assert.match(troopHtml, /name="expected_value"/);
  assert.match(troopComboRules, /expected_value/);
  assert.match(troopComboRules, /unpackTroopComboRule/);
  assert.match(troopComboCodec, /numericText\(parsed\?\.difficulty\)/);
  assert.doesNotMatch(troopComboRules, /fillBlank\("difficulty"/);
});
