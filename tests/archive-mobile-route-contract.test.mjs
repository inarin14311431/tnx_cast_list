import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/archive.js", import.meta.url), "utf8");

test("archive chooses cast view mode from current viewport", () => {
  assert.match(source, /const\s+MOBILE_VIEW_QUERY\s*=\s*["']\(max-width:\s*900px\)["']/);
  assert.match(source, /matchMedia\(MOBILE_VIEW_QUERY\)/);
  assert.match(source, /searchParams\.set\(["']mobile["']/);
});

test("archive does not hardcode every cast card to mobile view", () => {
  assert.doesNotMatch(source, /cast\.html\?id=\$\{[^\n]+\}&mobile=1/);
});
