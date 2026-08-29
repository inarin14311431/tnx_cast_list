import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const entry = await readFile(new URL("../css-next/pages/account-entry.css", import.meta.url), "utf8");
const base = await readFile(new URL("../css-next/pages/account.css", import.meta.url), "utf8");
const actions = await readFile(new URL("../css-next/pages/account-action-hierarchy.css", import.meta.url), "utf8");

test("account card layout is owned by the action layer", () => {
  assert.doesNotMatch(base, /\.owned-cast-list\s*\{/);
  assert.doesNotMatch(base, /\.owned-cast\s*\{/);
  assert.doesNotMatch(base, /\.owned-cast__links\s*\{/);
  assert.match(actions, /\.owned-cast-list\s*\{/);
  assert.match(actions, /\.owned-cast\s*\{/);
  assert.match(actions, /\.owned-cast__links\s*\{/);
});

test("troop and act management layout is consolidated into the account action layer", () => {
  assert.match(actions, /owned-cast__management > \.owned-cast__troops/);
  assert.match(actions, /owned-cast__management:not\(\.owned-cast__management--with-troop\) > \.owned-cast__acts/);
  assert.match(actions, /grid-column:\s*1 \/ 3/);
  assert.doesNotMatch(entry, /account-troop-links-v2\.css/);
  await assert.rejects(access(new URL("../css-next/pages/account-troop-links-v2.css", import.meta.url)));
});

test("account entry keeps one canonical action layer after the base stylesheet", () => {
  assert.match(entry, /account\.css\?v=12/);
  assert.match(entry, /account-action-hierarchy\.css\?v=8/);
  assert.doesNotMatch(entry, /account-troops/);
});
