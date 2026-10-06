import { actShowcaseCssEntry, actShowcaseCss } from "./helpers/act-showcase-css.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("showcase loads the writing-pattern layer after story-flow through explicit entries", async () => {
  const [entry, bootstrap] = await Promise.all([
    actShowcaseCssEntry(),
    read("js/act-showcase-bootstrap.js")
  ]);
  const storyCss = entry.indexOf("act-showcase-story-flow.css");
  const patternCss = entry.indexOf("act-showcase-writing-patterns.css");
  const storyJs = bootstrap.indexOf("act-showcase-story-flow.js");
  const patternJs = bootstrap.indexOf("act-showcase-writing-patterns.js");
  assert.ok(storyCss >= 0 && patternCss > storyCss);
  assert.ok(storyJs >= 0 && patternJs > storyJs);
});

test("handout parser accepts common N◎VA metadata variants", async () => {
  const js = await read("js/act-showcase-writing-patterns.js");
  for (const label of ["推奨スタイル", "推奨設定", "コネ", "推奨スート", "クイックスタート", "条件", "キャスト間コネ", "関係", "ＰＳ", "使命"]) {
    assert.match(js, new RegExp(label));
  }
  assert.match(js, /parsePackedFields/);
  assert.match(js, /firstNarrativeHook/);
  assert.match(js, /structured/);
  assert.match(js, /mixed/);
  assert.match(js, /prose/);
  assert.match(js, /compact/);
});

test("writing-patterns owns the final handout context content, replacing whatever story-flow built first", async () => {
  const [writing, story] = await Promise.all([
    read("js/act-showcase-writing-patterns.js"),
    read("js/act-showcase-story-flow.js")
  ]);
  // story-flow.js only ever builds the ROLE-only framework (see act-showcase-story-flow-contract.test.mjs);
  // it must not decide the ENTRY/CONNECTION/PS cell content or the assigned-route wording itself.
  assert.doesNotMatch(story, /parseHandout/);
  // normalizeHandoutContext() fully replaces the cells (not append), so whatever framework story-flow
  // built is discarded and rebuilt from this module's own analysis on every content change.
  assert.match(writing, /cells\.replaceChildren\(createCell\("ROLE", roleValue, "is-role"\)\)/);
  assert.match(writing, /sequence\.dataset\.storyConnection = compact\(preferredRoute, 110\)/);
  assert.match(writing, /sequence\.dataset\.storyPs = compact\(analysis\.fields\.get\("ps"\)\?\.value \|\| "", 96\)/);
  // normalizeAssignedRoute() then overwrites the assigned-route <strong> text using those same
  // writing-patterns-owned dataset values, not any value story-flow.js may have set.
  assert.match(writing, /const value = clean\(sequence\.dataset\.storyConnection\) \|\| clean\(sequence\.dataset\.storyPs\)/);
  assert.match(writing, /if \(value && route\.textContent !== value\) route\.textContent = value/);
});

test("trailer patterns preserve author line breaks and adapt typography", async () => {
  const [js, css] = await Promise.all([
    read("js/act-showcase-writing-patterns.js"),
    actShowcaseCss("act-showcase-writing-patterns")
  ]);
  assert.match(js, /dataset\.trailerPattern/);
  for (const pattern of ["verse", "prose", "compact", "hybrid"]) {
    assert.match(js, new RegExp(`\\"${pattern}\\"`));
    assert.match(css, new RegExp(`data-trailer-pattern=\\"${pattern}\\"`));
  }
  assert.match(css, /white-space:pre-wrap/);
});

test("writing pattern title rules remain responsive without important declarations", async () => {
  // The base and data-fit title sizes in this file were fully shadowed by act-showcase-cinematic-v2.css
  // (same selector, same property, loaded later) and were removed; the effective sizes live there.
  const css = await actShowcaseCss("act-showcase-writing-patterns");
  const effective = await actShowcaseCss("act-showcase-cinematic-v2");
  assert.match(effective, /font-size:clamp\(2\.7rem,5vw,6\.2rem\)/);
  assert.match(effective, /data-fit=\"medium\"/);
  assert.match(effective, /data-fit=\"long\"/);
  assert.match(effective, /data-fit=\"xlong\"/);
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(effective, /!important/);
});
