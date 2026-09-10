import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const management = await readFile(new URL("../js/showcase-owned-list.js", import.meta.url), "utf8");
const loader = await readFile(new URL("../js/showcase-generator-loader.js", import.meta.url), "utf8");
const restore = await readFile(new URL("../js/showcase-edit-restore.js", import.meta.url), "utf8");
const deletion = await readFile(new URL("../js/showcase-delete.js", import.meta.url), "utf8");

test("published showcase management stays selector based without duplicate published-item cards", () => {
  assert.match(loader, /showcase-owned-list\.js\?v=2/);
  assert.match(management, /公開済みアクト紹介/);
  assert.match(management, /PUBLISHED SHOWCASE MANAGEMENT/);
  assert.match(management, /managementMode = "selector"/);
  assert.match(management, /owned-showcase-empty-state/);
  assert.match(management, /公開済みのアクト紹介はありません/);
  assert.doesNotMatch(management, /owned-showcase-row/);
  assert.doesNotMatch(management, /data-showcase-action/);
  assert.doesNotMatch(management, /legacyControls\.hidden/);
});

test("empty management state disappears as soon as a published showcase option exists", () => {
  assert.match(management, /some\(option => String\(option\.value \|\| ""\)\.trim\(\)\)/);
  assert.match(management, /emptyState\.hidden = hasPublishedShowcase/);
  assert.match(management, /MutationObserver\(syncEmptyState\)/);
});

test("one dropdown controls both restore and delete actions", () => {
  assert.match(restore, /id="owned-showcase-select"/);
  assert.match(restore, /id="load-owned-showcase"/);
  assert.match(deletion, /id = "delete-owned-showcase"/);
  assert.match(deletion, /loadButton\.insertAdjacentElement\("afterend", deleteButton\)/);
});
