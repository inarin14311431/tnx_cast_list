import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync("showcase-generator.html", "utf8");
const source = fs.readFileSync("js/showcase-wording.js", "utf8");

test("showcase wording observer does not rewrite unchanged guide text", () => {
  assert.match(source, /if \(guide\.textContent !== nextText\) guide\.textContent = nextText;/);
  assert.match(source, /if \(guide\.dataset\.state !== nextState\) guide\.dataset\.state = nextState;/);
});

test("showcase generator loads the fixed wording observer cache boundary", () => {
  assert.match(html, /showcase-wording\.js\?v=3/);
  assert.doesNotMatch(html, /showcase-wording\.js\?v=2/);
});
