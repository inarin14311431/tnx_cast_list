import test from "node:test";
import assert from "node:assert/strict";
import {
  appendRow,
  appendRows,
  clearRows,
  moveAdjacentRow,
  moveRowWithinCategory,
  normalizeOutfitCategory,
  removeRowByKey
} from "../js/sheet-row-collection-state.js";

test("appendRow appends without mutating the source", () => {
  const source = [{ _key: "a" }];
  const row = { _key: "b" };
  const result = appendRow(source, row);
  assert.deepEqual(result.map(item => item._key), ["a", "b"]);
  assert.deepEqual(source.map(item => item._key), ["a"]);
});

test("appendRows appends a batch without mutating either source array", () => {
  const source = [{ _key: "a" }];
  const additions = [{ _key: "b" }, { _key: "c" }];
  const result = appendRows(source, additions);
  assert.deepEqual(result.map(item => item._key), ["a", "b", "c"]);
  assert.deepEqual(source.map(item => item._key), ["a"]);
  assert.deepEqual(additions.map(item => item._key), ["b", "c"]);
});

test("clearRows returns a fresh empty collection", () => {
  const source = [{ _key: "a" }];
  const result = clearRows(source);
  assert.deepEqual(result, []);
  assert.notEqual(result, source);
  assert.equal(source.length, 1);
});

test("removeRowByKey removes only the requested editor row without mutating the source", () => {
  const source = [{ _key: "a" }, { _key: "b" }, { _key: "c" }];
  const result = removeRowByKey(source, "b");
  assert.deepEqual(result.map(item => item._key), ["a", "c"]);
  assert.deepEqual(source.map(item => item._key), ["a", "b", "c"]);
});

test("moveAdjacentRow swaps adjacent rows without mutating the source", () => {
  const source = [{ _key: "a" }, { _key: "b" }, { _key: "c" }];
  const result = moveAdjacentRow(source, "b", "up");
  assert.equal(result.moved, true);
  assert.deepEqual(result.rows.map(item => item._key), ["b", "a", "c"]);
  assert.deepEqual(source.map(item => item._key), ["a", "b", "c"]);
});

test("moveAdjacentRow supports alternate key selectors and filtered movement", () => {
  const source = [
    { id: "a", enabled: true },
    { id: "b", enabled: false },
    { id: "c", enabled: true }
  ];
  const result = moveAdjacentRow(source, "c", "up", {
    keyOf: item => item.id,
    canCross: (_current, candidate) => candidate.enabled
  });
  assert.equal(result.moved, true);
  assert.deepEqual(result.rows.map(item => item.id), ["c", "b", "a"]);
});

test("moveRowWithinCategory skips rows from other categories and preserves them", () => {
  const source = [
    { _key: "g1", category: "general" },
    { _key: "s1", category: "social" },
    { _key: "g2", category: "general" },
    { _key: "c1", category: "connection" }
  ];
  const result = moveRowWithinCategory(source, "g2", "up");
  assert.equal(result.moved, true);
  assert.deepEqual(result.rows.map(item => item._key), ["g2", "s1", "g1", "c1"]);
  assert.deepEqual(source.map(item => item._key), ["g1", "s1", "g2", "c1"]);
});

test("moveRowWithinCategory is a no-op at category boundaries", () => {
  const source = [{ _key: "g1", category: "general" }, { _key: "s1", category: "social" }];
  const result = moveRowWithinCategory(source, "g1", "up");
  assert.equal(result.moved, false);
  assert.deepEqual(result.rows, source);
});

test("normalizeOutfitCategory accepts canonical categories and falls back to other", () => {
  const categories = new Set(["weapon", "armor", "other"]);
  assert.equal(normalizeOutfitCategory("weapon", categories), "weapon");
  assert.equal(normalizeOutfitCategory("unknown", categories), "other");
  assert.equal(normalizeOutfitCategory("", categories), "other");
});
