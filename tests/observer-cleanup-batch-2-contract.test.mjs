import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const history = await readFile(new URL("../js/showcase-history-role.js", import.meta.url), "utf8");
const mobileUi = await readFile(new URL("../js/sheet-mobile-ui.js", import.meta.url), "utf8");

test("showcase role persistence relies on wrapped completion results without status observation", () => {
  assert.match(history, /record_act_history_for_current_user/);
  assert.match(history, /publish-showcase/);
  assert.match(history, /persistRolesWithoutBreakingHistory/);
  assert.doesNotMatch(history, /MutationObserver/);
  assert.doesNotMatch(history, /persistRolesByCurrentSlug/);
});

test("mobile delete promotion observes only editor dialogs", () => {
  assert.match(mobileUi, /querySelectorAll\("\.mobile-editor-dialog"\)/);
  assert.match(mobileUi, /dialogs\.forEach\(dialog=>observer\.observe\(dialog,/);
  assert.doesNotMatch(mobileUi, /observer\.observe\(document\.body/);
});
