import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const layoutSource = await readFile(new URL("../js/outfit-display-rules-v5.js", import.meta.url), "utf8");

test("outfit layout keeps observing while it applies its own layout", () => {
  assert.match(layoutSource, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(layoutSource, /observer\.disconnect\(\)/);
});

test("outfit layout remains idempotent so observer feedback settles", () => {
  assert.match(layoutSource, /if \(queued \|\| applying\) return/);
  assert.match(layoutSource, /if \(ordered\.length === current\.length && ordered\.every/);
});
