import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/archive-id-code.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const format = context.window.TNXArchiveId.format;
const pattern = /^TNX-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/;

test("archive display code is stable and code-like", () => {
  const code = format("87");
  assert.match(code, pattern);
  assert.equal(format("87"), code);
  assert.equal(format(" 87 "), code);
});

test("neighboring sequence numbers do not expose a visible sequence", () => {
  const codes = [87, 88, 89, 90, 91].map(value => format(String(value)));
  assert.equal(new Set(codes).size, codes.length);
  for (const [index, code] of codes.entries()) {
    assert.match(code, pattern);
    assert.doesNotMatch(code, new RegExp(`${87 + index}$`));
  }
});

test("empty IDs use a non-numeric sentinel", () => {
  assert.equal(format(""), "TNX-VOID-VOID");
});
