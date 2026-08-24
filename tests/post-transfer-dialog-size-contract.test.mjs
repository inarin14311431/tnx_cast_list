import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dialogCss = await readFile(new URL("../css-next/components/dialog.css", import.meta.url), "utf8");
const indexCss = await readFile(new URL("../css-next/index.css", import.meta.url), "utf8");

test("POST transfer dialog has a desktop-sized responsive shell and full iframe", () => {
  assert.match(dialogCss, /\.cast-transfer-dialog\s*\{/);
  assert.match(dialogCss, /width:\s*min\(920px,\s*calc\(100vw - 40px\)\)/);
  assert.match(dialogCss, /height:\s*min\(82vh,\s*760px\)/);
  assert.match(dialogCss, /\.cast-transfer-dialog__shell[\s\S]*height:\s*100%/);
  assert.match(dialogCss, /\.cast-transfer-dialog__frame[\s\S]*width:\s*100%[\s\S]*height:\s*100%/);
});

test("dialog component cache key is refreshed", () => {
  assert.match(indexCss, /components\/dialog\.css\?v=2/);
});
