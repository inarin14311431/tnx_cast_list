import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const admin = await readFile(new URL("../js/master-data-admin.js", import.meta.url), "utf8");
const deletion = await readFile(new URL("../js/master-user-delete.js", import.meta.url), "utf8");
const bootstrap = await readFile(new URL("../js/privileged-tools-bootstrap.js", import.meta.url), "utf8");

test("master data admin publishes explicit user-panel lifecycle events", () => {
  assert.match(admin, /USER_PANEL_READY_EVENT = "tnx:master-user-panel-ready"/);
  assert.match(admin, /USER_SELECTION_CHANGED_EVENT = "tnx:master-user-selection-changed"/);
  assert.match(admin, /layout\.dispatchEvent\(new CustomEvent\(USER_PANEL_READY_EVENT/);
  assert.match(admin, /panel\.dispatchEvent\(new CustomEvent\(USER_SELECTION_CHANGED_EVENT\)\)/);
});

test("master user deletion waits on lifecycle events without DOM observation or polling", () => {
  assert.match(deletion, /resolveUserPanel\(5000\)/);
  assert.match(deletion, /layout\.addEventListener\(USER_PANEL_READY_EVENT, onReady\)/);
  assert.match(deletion, /panel\.addEventListener\(USER_SELECTION_CHANGED_EVENT, refresh\)/);
  assert.doesNotMatch(deletion, /MutationObserver/);
  assert.doesNotMatch(deletion, /setInterval/);
});

test("master user lifecycle keeps server-side administrator protection and refreshed module boundaries", () => {
  assert.match(deletion, /管理者アカウントはサーバー側で保護されます/);
  assert.doesNotMatch(deletion, /PRIMARY_ADMIN_USER_ID|PRIMARY_ADMIN_EMAIL/);
  assert.doesNotMatch(admin, /PRIMARY_ADMIN_USER_ID|PRIMARY_ADMIN_EMAIL/);
  assert.match(bootstrap, /master-data-admin\.js\?v=4/);
  assert.match(bootstrap, /master-user-delete\.js\?v=4/);
});
