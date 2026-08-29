import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const troopEntry = await read("css-next/pages/troop-entry.css");
const accountEntry = await read("css-next/pages/account-entry.css");
const sheetEntry = await read("css-next/pages/sheet-entry.css");

test("page entries use canonical responsibility-based CSS names", () => {
  assert.match(troopEntry, /troop-layout\.css\?v=1/);
  assert.match(troopEntry, /troop-combo-rules\.css\?v=1/);
  assert.doesNotMatch(troopEntry, /troops-v4\.css|troop-combo-rule-v2\.css/);
  assert.match(accountEntry, /account-actions\.css\?v=1/);
  assert.doesNotMatch(accountEntry, /account-action-hierarchy\.css/);
  assert.match(sheetEntry, /style-separators\.css\?v=1/);
  assert.doesNotMatch(sheetEntry, /style-separator-fix\.css/);
});

test("temporary legacy CSS copies remain byte-identical and unloaded", async () => {
  const pairs = [
    ["css-next/pages/troop-layout.css", "css-next/pages/troops-v4.css"],
    ["css-next/pages/troop-combo-rules.css", "css-next/pages/troop-combo-rule-v2.css"],
    ["css-next/pages/account-actions.css", "css-next/pages/account-action-hierarchy.css"],
    ["css-next/editor/style-separators.css", "css-next/editor/style-separator-fix.css"]
  ];
  for (const [canonical, legacy] of pairs) {
    assert.equal(await read(canonical), await read(legacy));
  }
});
