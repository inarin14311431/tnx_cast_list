import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../acts.html", import.meta.url), "utf8");

test("acts page loads only the central readable layout stylesheet", () => {
  assert.match(html, /css-next\/pages\/acts-entry\.css\?v=16/);
  assert.doesNotMatch(html, /acts-20260822\.css/);
  assert.doesNotMatch(html, /acts-default-readable\.css/);
  assert.doesNotMatch(html, /acts-ledger-layout\.css/);
  assert.doesNotMatch(html, /acts-ledger-corrections\.css/);
});

test("acts page loads the centralized handle formatter before the app", () => {
  assert.match(
    html,
    /js\/handle-format\.js\?v=3[\s\S]*js\/acts-app\.js\?v=4/
  );
});
