import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const entry = await readFile(new URL("../css-next/pages/account-entry.css", import.meta.url), "utf8");
const base = await readFile(new URL("../css-next/pages/account.css", import.meta.url), "utf8");
const actions = await readFile(new URL("../css-next/pages/account-actions.css", import.meta.url), "utf8");

test("account card layout is owned by the action layer", () => {
  assert.doesNotMatch(base, /\.owned-cast-list\s*\{/);
  assert.doesNotMatch(base, /\.owned-cast\s*\{/);
  assert.doesNotMatch(base, /\.owned-cast__links\s*\{/);
  assert.match(actions, /\.owned-cast-list\s*\{/);
  assert.match(actions, /\.owned-cast\s*\{/);
  assert.match(actions, /\.owned-cast__links\s*\{/);
});

test("troop and act management layout is consolidated into the account action layer", async () => {
  assert.match(actions, /owned-cast__management > \.owned-cast__troops/);
  // The act link keeps the same single-column width as the primary OPEN / EDIT SHEET actions.
  assert.match(actions, /\.owned-cast__management\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(actions, /\.owned-cast__management > \.owned-cast__acts\s*\{\s*grid-column:\s*1;/);
  assert.doesNotMatch(actions, /owned-cast__management:not\(\.owned-cast__management--with-troop\) > \.owned-cast__acts/);
  assert.match(actions, /owned-cast__management--with-troop > :is\(\.owned-cast__management-label, button\)\s*\{\s*grid-column:\s*3;/);
  assert.doesNotMatch(entry, /account-troop-links-v2\.css/);
  await assert.rejects(access(new URL("../css-next/pages/account-troop-links-v2.css", import.meta.url)));
});

test("account entry keeps one canonical action layer after the base stylesheet", () => {
  assert.match(entry, /account\.css\?v=12/);
  assert.match(entry, /account-actions\.css\?v=1/);
  assert.doesNotMatch(entry, /account-action-hierarchy\.css|account-troops/);
});
