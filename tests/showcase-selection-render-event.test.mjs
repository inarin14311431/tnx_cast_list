import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tagline = await readFile(new URL("../js/showcase-tagline.js", import.meta.url), "utf8");
const auto = await readFile(new URL("../js/showcase-tagline-auto.js", import.meta.url), "utf8");
const remove = await readFile(new URL("../js/showcase-remove-label.js", import.meta.url), "utf8");

test("showcase selection rendering publishes one shared lifecycle event", () => {
  assert.match(tagline, /dispatchEvent\(new CustomEvent\("tnx:showcase-selection-rendered"\)\)/);
});

test("showcase presentation helpers consume the shared event without duplicate observers", () => {
  for (const source of [auto, remove]) {
    assert.match(source, /addEventListener\("tnx:showcase-selection-rendered"/);
    assert.doesNotMatch(source, /MutationObserver/);
  }
});
