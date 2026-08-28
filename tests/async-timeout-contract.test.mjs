import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync("js/async-timeout.js", "utf8");
const account = fs.readFileSync("js/account.js", "utf8");
const acts = fs.readFileSync("js/acts-app.js", "utf8");
const showcase = fs.readFileSync("js/showcase-dynamic-publish.js", "utf8");

test("one shared finite timeout boundary owns timer mechanics", () => {
  assert.match(helper, /DEFAULT_REQUEST_TIMEOUT_MS = 12000/);
  assert.match(helper, /Promise\.race/);
  assert.match(helper, /globalThis\.setTimeout/);
  assert.match(helper, /finally\(\(\) => globalThis\.clearTimeout/);
});

test("network-heavy operational modules use the shared timeout helper", () => {
  for (const source of [account, acts, showcase]) {
    assert.match(source, /withRequestTimeout/);
    assert.match(source, /async-timeout\.js\?v=1/);
    assert.doesNotMatch(source, /function withRequestTimeout\(/);
  }
});
