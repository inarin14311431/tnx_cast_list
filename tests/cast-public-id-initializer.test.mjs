import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("all display IDs use the shared formatter; legacy competing writer is absent", async () => {
  const formatter = await readFile(new URL("../js/archive-id-code.js", import.meta.url), "utf8");
  const context = { window: {} };
  vm.runInNewContext(formatter, context);
  assert.equal(context.window.TNXArchiveId.format("TNX-000172"), "TNX-DEST-VSB4");
  assert.equal(context.window.TNXArchiveId.format("TNX-000172"), context.window.TNXArchiveId.format(" TNX-000172 "));
  const controls = await readFile(new URL("../js/cast-view-controls.js", import.meta.url), "utf8");
  assert.doesNotMatch(controls, /obfuscatePublicId|initializeCastPublicId|#cast-public-id/);
});
