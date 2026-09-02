import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("character sheet source proxy is authenticated and host-pinned", async () => {
  const source = await read("supabase/functions/character-sheet-source/index.ts");
  assert.match(source, /requireAuthenticatedUser/);
  assert.match(source, /character-sheets\.appspot\.com/);
  assert.match(source, /new URL\(`https:\/\/\$\{SOURCE_HOST\}/);
  assert.match(source, /MAX_RESPONSE_BYTES/);
  assert.match(source, /AbortController/);
  assert.doesNotMatch(source, /request\.url/);
});
