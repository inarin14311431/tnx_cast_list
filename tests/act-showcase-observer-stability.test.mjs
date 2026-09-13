import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("NeoTokyo decoration observers ignore typewriter churn while preserving linked-screen state changes", async () => {
  const [story, writing, supporting, visual, board] = await Promise.all([
    read("js/act-showcase-story-flow.js"),
    read("js/act-showcase-writing-patterns.js"),
    read("js/act-showcase-supporting-cast.js"),
    read("js/act-showcase-visual-caption-code.js"),
    read("js/act-showcase-board-layout.js")
  ]);
  assert.match(story, /hasStructuralElementMutation/);
  assert.match(story, /hasLinkedScreenStateMutation/);
  assert.match(story, /observer\.observe\(intro, \{ childList: true, subtree: true, attributes: true, attributeFilter: \["class"\] \}\)/);
  assert.match(story, /target\.matches\("\.neotokyo-sequence__screen--linked"\)/);
  assert.match(writing, /hasStructuralElementMutation/);
  assert.match(writing, /hasLinkedScreenStateMutation/);
  assert.match(writing, /observer\.observe\(intro, \{ childList: true, subtree: true, attributes: true, attributeFilter: \["class"\] \}\)/);
  assert.match(writing, /target\.matches\("\.neotokyo-sequence__screen--linked"\)/);
  assert.match(supporting, /hasStructuralElementMutation/);
  assert.match(supporting, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(visual, /observer\.observe\(story, \{ childList: true, subtree: true \}\)/);
  assert.match(board, /hasStructuralElementMutation/);
  assert.match(board, /observer\.observe\(story, \{ childList: true, subtree: true \}\)/);
  assert.match(board, /observer\.observe\(intro, \{ childList: true, subtree: true \}\)/);
  for (const source of [supporting, visual, board]) assert.doesNotMatch(source, /attributes:\s*true/);
});

test("observer-owned DOM writes are idempotent and cannot retrigger forever", async () => {
  const [story, writing, supporting, visual, board] = await Promise.all([
    read("js/act-showcase-story-flow.js"),
    read("js/act-showcase-writing-patterns.js"),
    read("js/act-showcase-supporting-cast.js"),
    read("js/act-showcase-visual-caption-code.js"),
    read("js/act-showcase-board-layout.js")
  ]);
  assert.match(story, /classList\.toggle\("is-role-primary", primary\)/);
  assert.match(story, /classList\.toggle\("is-role-duplicate", duplicate\)/);
  assert.match(writing, /value && route\.textContent !== value/);
  assert.match(supporting, /function setTextIfChanged/);
  assert.match(supporting, /target\.textContent !== next/);
  assert.match(visual, /span\.textContent !== visualMeta/);
  assert.match(visual, /strong\.textContent !== code/);
  assert.match(board, /const setTextIfChanged/);
  assert.match(board, /if \(queued\) return/);
});

test("public showcase bootstrap cache-busts every stable observer script", async () => {
  const bootstrap = await read("js/act-showcase-bootstrap.js");
  const hasVersionedImport = path => new RegExp(`${path.replaceAll(".", "\\.")}\\?v=[^\\"')\\s]+`).test(bootstrap);
  assert.ok(hasVersionedImport("act-showcase-board-layout.js"));
  assert.ok(hasVersionedImport("act-showcase-story-flow.js"));
  assert.ok(hasVersionedImport("act-showcase-writing-patterns.js"));
  assert.ok(hasVersionedImport("act-showcase-visual-caption-code.js"));
  assert.ok(hasVersionedImport("act-showcase-supporting-cast.js"));
});
