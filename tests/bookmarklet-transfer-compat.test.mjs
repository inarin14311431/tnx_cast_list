import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production cast transfer route keeps bookmarklet mode active", async () => {
  const router = await read("js/direct-transfer-button.js");
  const exporter = await read("js/transfer-tsv-export.js");
  const bookmarklet = await read("js/tnx-transfer-bookmarklet.js");

  assert.match(router, /ACTIVE_MODE = "bookmarklet"/);
  assert.match(router, /import\("\.\/transfer-tsv-export\.js\?v=1"\)/);
  assert.doesNotMatch(router, /direct-transfer-button-post\.js/);
  assert.match(exporter, /TNX_CAST_TRANSFER_TSV/);
  assert.match(exporter, /転記TSV/);
  assert.match(exporter, /転記BM/);
  assert.match(exporter, /tnx-transfer-bookmarklet\.js\?v=2/);
  assert.match(bookmarklet, /TNX_CAST_TRANSFER_TSV/);
});

test("production bookmarklet exporter keeps armor control and SPI mapping", async () => {
  const exporter = await read("js/transfer-tsv-export.js");

  assert.match(exporter, /category === "armor" \? \(details\.control_value \|\| legacy\.control \|\| ""\)/);
  assert.match(exporter, /protecS: details\.defense_s/);
  assert.match(exporter, /protecP: details\.defense_p/);
  assert.match(exporter, /protecI: details\.defense_i/);
});
