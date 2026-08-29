import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dialogCss = await readFile(new URL("../css-next/components/dialog.css", import.meta.url), "utf8");

test("POST transfer dialog keeps a viewport-bounded responsive shell and full iframe", () => {
  assert.match(dialogCss, /\.cast-transfer-dialog\s*\{/);
  assert.match(dialogCss, /width:\s*min\([^;]*100vw[^;]*\)/);
  assert.match(dialogCss, /height:\s*min\([^;]*vh[^;]*\)/);
  assert.match(dialogCss, /\.cast-transfer-dialog__shell[\s\S]*height:\s*100%/);
  assert.match(dialogCss, /\.cast-transfer-dialog__frame[\s\S]*width:\s*100%[\s\S]*height:\s*100%/);
});
