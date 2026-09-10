import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("archive page-size label stays compact on one line", () => {
  assert.match(html, /archive-control--page-size"><span>件数 <small>ITEMS<\/small><\/span>/);
  assert.doesNotMatch(html, /表示件数/);
  assert.doesNotMatch(html, /ITEMS PER PAGE/);
});
