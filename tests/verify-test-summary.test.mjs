import test from "node:test";
import assert from "node:assert/strict";
import { parseTestSummary } from "../scripts/verify-test-summary.mjs";

test("parseTestSummary reads Node spec reporter summary", () => {
  assert.deepEqual(
    parseTestSummary("ℹ tests 123\nℹ pass 120\nℹ fail 3\n"),
    { parsed: true, pass: 120, fail: 3 }
  );
});

test("parseTestSummary reads Node TAP reporter summary", () => {
  assert.deepEqual(
    parseTestSummary("# tests 123\n# pass 123\n# fail 0\n"),
    { parsed: true, pass: 123, fail: 0 }
  );
});

test("parseTestSummary rejects output without a complete summary", () => {
  assert.deepEqual(
    parseTestSummary("all tests look fine\n"),
    { parsed: false, pass: null, fail: null }
  );
});
