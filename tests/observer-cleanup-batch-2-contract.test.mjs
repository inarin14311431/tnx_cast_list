import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mobileUi = await readFile(new URL("../js/sheet-mobile-ui.js", import.meta.url), "utf8");

test("showcase role persistence is an explicit call after publishing, not a wrapper around supabase.rpc / functions.invoke", async () => {
  // js/showcase-history-role.js wrapped record_act_history_for_current_user and publish-showcase only, so the current publish was never covered
  // (and supabase.functions returns a new object on every access, so wrapping invoke never held); the role now goes through syncActCastOrders.
  const sync = await readFile(new URL("../js/showcase-cast-order-sync.js", import.meta.url), "utf8");
  assert.match(sync, /participationRole/);
  assert.doesNotMatch(sync, /MutationObserver/);
  await assert.rejects(() => readFile(new URL("../js/showcase-history-role.js", import.meta.url), "utf8"), /ENOENT/);
});

test("mobile delete promotion observes only editor dialogs", () => {
  assert.match(mobileUi, /querySelectorAll\("\.mobile-editor-dialog"\)/);
  assert.match(mobileUi, /document\.querySelectorAll\("\.mobile-editor-dialog"\)\.forEach\(observeDialog\)/);
  assert.match(mobileUi, /observer\.observe\(dialog,options\)/);
  assert.match(mobileUi, /observer\.observe\(document\.body,\{childList:true\}\)/);
  assert.doesNotMatch(mobileUi, /observer\.observe\(document\.body,\{childList:true,subtree:true/);
});
