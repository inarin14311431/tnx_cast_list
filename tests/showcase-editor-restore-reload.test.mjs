import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/showcase-edit-restore.js", import.meta.url), "utf8");

test("explicit restore uses a clean reload and removes the restore parameter after hydration", () => {
  assert.match(source, /url\.searchParams\.set\(RESTORE_PARAM, slug\)/);
  assert.match(source, /location\.assign\(url\.href\)/);
  assert.match(source, /cleanUrl\.searchParams\.delete\(RESTORE_PARAM\)/);
  assert.match(source, /history\.replaceState\(null, "", cleanUrl\.href\)/);
});
