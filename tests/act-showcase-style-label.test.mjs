import test from "node:test";
import assert from "node:assert/strict";
import { parseStyleLabel } from "../js/act-showcase-style-label.js";

test("style label without marks: name only, nothing lit", () => {
  assert.deepEqual(parseStyleLabel("ニューロ"), { label: "ニューロ", name: "ニューロ", persona: false, key: false });
});

test("style label with one mark lights only that mark", () => {
  assert.deepEqual(parseStyleLabel("カブキ◎"), { label: "カブキ◎", name: "カブキ", persona: true, key: false });
  assert.deepEqual(parseStyleLabel("カゼ●"), { label: "カゼ●", name: "カゼ", persona: false, key: true });
});

test("style label with both marks lights both, in either order", () => {
  assert.deepEqual(parseStyleLabel("カブト◎●"), { label: "カブト◎●", name: "カブト", persona: true, key: true });
  assert.deepEqual(parseStyleLabel("カブト●◎"), { label: "カブト●◎", name: "カブト", persona: true, key: true });
});

test("three cards of the same style each parse on their own", () => {
  const cards = ["カゲムシャ◎", "カゲムシャ●", "カゲムシャ"].map(parseStyleLabel);
  assert.deepEqual(cards.map(card => card.name), ["カゲムシャ", "カゲムシャ", "カゲムシャ"]);
  assert.deepEqual(cards.map(card => [card.persona, card.key]), [[true, false], [false, true], [false, false]]);
});

test("surrounding spaces are dropped and a marks-only label keeps its text as the name", () => {
  assert.equal(parseStyleLabel("  エグゼク ◎ ").name, "エグゼク");
  assert.deepEqual(parseStyleLabel("◎●"), { label: "◎●", name: "◎●", persona: true, key: true });
  assert.deepEqual(parseStyleLabel(undefined), { label: "", name: "", persona: false, key: false });
});
