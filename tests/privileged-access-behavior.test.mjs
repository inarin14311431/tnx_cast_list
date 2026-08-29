import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const original = await readFile(new URL("../js/sheet-master-search-access.js", import.meta.url), "utf8");
const source = original.replace(/^import .*;\s*$/gm, "");

function createButton() {
  return {
    hidden: false,
    disabled: false,
    removed: false,
    remove() { this.removed = true; }
  };
}

async function runAccessCheck(rpcResult) {
  const skd = createButton();
  const ofc = createButton();
  const dialog = { removed: false, remove() { this.removed = true; } };
  const warnings = [];

  const document = {
    querySelector(selector) {
      if (selector === "#search-skd-master") return skd;
      if (selector === "#search-ofc-master") return ofc;
      if (selector === "#master-search-dialog") return dialog;
      return null;
    }
  };

  const supabase = {
    rpc(name) {
      assert.equal(name, "has_privileged_editor_tools");
      return Promise.resolve(rpcResult);
    }
  };

  const context = {
    document,
    supabase,
    console: { warn: (...args) => warnings.push(args) },
    Promise
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__accessState = { buttons, dialog };`, context);
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  return { skd, ofc, dialog, warnings };
}

test("privileged master controls start hidden and become usable only after explicit allow", async () => {
  const { skd, ofc, dialog, warnings } = await runAccessCheck({ data: true, error: null });

  assert.equal(skd.hidden, false);
  assert.equal(skd.disabled, false);
  assert.equal(ofc.hidden, false);
  assert.equal(ofc.disabled, false);
  assert.equal(skd.removed, false);
  assert.equal(ofc.removed, false);
  assert.equal(dialog.removed, false);
  assert.equal(warnings.length, 0);
});

test("privileged master controls fail closed when authorization is denied", async () => {
  const { skd, ofc, dialog, warnings } = await runAccessCheck({ data: false, error: null });

  assert.equal(skd.hidden, true);
  assert.equal(skd.disabled, true);
  assert.equal(ofc.hidden, true);
  assert.equal(ofc.disabled, true);
  assert.equal(skd.removed, true);
  assert.equal(ofc.removed, true);
  assert.equal(dialog.removed, true);
  assert.equal(warnings.length, 0);
});

test("privileged master controls fail closed when the RPC errors", async () => {
  const error = new Error("network failure");
  const { skd, ofc, dialog, warnings } = await runAccessCheck({ data: null, error });

  assert.equal(skd.removed, true);
  assert.equal(ofc.removed, true);
  assert.equal(dialog.removed, true);
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0][0]), /Master search access check failed/);
});
