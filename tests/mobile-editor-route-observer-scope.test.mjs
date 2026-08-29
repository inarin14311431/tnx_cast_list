import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/mobile-editor-route.js", import.meta.url), "utf8");

test("mobile editor route observes only the mobile cast view for dynamic topbar insertion", () => {
  assert.match(source, /const mobileView = document\.querySelector\("#mobile-cast-view"\)/);
  assert.match(source, /mobileView\?\.querySelector\("\.mobile-cast-topbar"\)/);
  assert.match(source, /if \(mobileView\) new MutationObserver\(sync\)\.observe\(mobileView, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(source, /observe\(document\.body, \{ childList: true, subtree: true \}\)/);
});
