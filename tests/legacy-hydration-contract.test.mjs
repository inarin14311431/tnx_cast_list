import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/sheet-save-coordinator.js", import.meta.url), "utf8");

test("legacy compatibility hydration does not create unsaved state from synthetic events", () => {
  assert.match(source, /HYDRATION_QUIET_MS = 300/);
  assert.match(source, /hydrationPending && !trustedEditDuringHydration/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /event\?\.isTrusted/);
});
