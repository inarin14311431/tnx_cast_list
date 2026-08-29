import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const icons = await readFile(new URL("../js/account-action-icons.js", import.meta.url), "utf8");
const troopLinks = await readFile(new URL("../js/account-mobile-editor-links.js", import.meta.url), "utf8");
const styleMarks = await readFile(new URL("../js/style-mark-normalizer.js", import.meta.url), "utf8");

test("account action icons remain the single owned-casts mutation publisher", () => {
  assert.match(icons, /const RENDER_EVENT = 'tnx:owned-casts-rendered'/);
  assert.match(icons, /dispatchEvent\(new CustomEvent\(RENDER_EVENT\)\)/);
  assert.match(icons, /new MutationObserver\(refresh\)\.observe\(root/);
});

test("account troop decorations consume render events without another observer", () => {
  assert.match(troopLinks, /addEventListener\("tnx:owned-casts-rendered", queueDecorate\)/);
  assert.doesNotMatch(troopLinks, /MutationObserver/);
});

test("account style marks consume render events while archive grid keeps its targeted observer", () => {
  assert.match(styleMarks, /accountRoot\?\.addEventListener\("tnx:owned-casts-rendered"/);
  assert.match(styleMarks, /observer\.observe\(archiveRoot, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(styleMarks, /observer\.observe\(accountRoot/);
});
