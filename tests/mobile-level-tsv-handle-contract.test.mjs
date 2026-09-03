import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const castHtml = await readFile(new URL("../cast.html", import.meta.url), "utf8");
const levelLabels = await readFile(new URL("../js/cast-mobile-level-labels.js", import.meta.url), "utf8");
const bookmarklet = await readFile(new URL("../js/tnx-transfer-bookmarklet.js", import.meta.url), "utf8");
const handleRepair = await readFile(new URL("../js/tnx-transfer-handle-repair.js", import.meta.url), "utf8");
const exporter = await readFile(new URL("../js/transfer-tsv-export.js", import.meta.url), "utf8");

test("mobile general/social/connection and style skill levels receive Lv labels", () => {
  assert.match(castHtml, /cast-mobile-level-labels\.js(?:\?v=\d+)?/);
  assert.match(levelLabels, /\.mobile-skill-row > b/);
  assert.match(levelLabels, /\.mobile-style-row > b/);
  assert.match(levelLabels, /`Lv\$\{value\.replace/);
});

test("TSV retains handle fields and repair maps them to target name fields", () => {
  assert.match(exporter, /handle:\s*character\.handle,\s*handle_kana:\s*character\.handle_kana/);
  assert.match(bookmarklet, /tnx-transfer-handle-repair\.js/);
  assert.match(handleRepair, /const handle = clean\(base\.handle\)/);
  assert.match(handleRepair, /base\.name/);
  assert.match(handleRepair, /base\.namekana/);
  assert.match(handleRepair, /handle_kana/);
});
