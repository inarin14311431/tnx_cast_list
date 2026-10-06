import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { normalizeShowcaseDisplayQuotes } from "../js/showcase-display-format.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Until 5c the same rule existed three times (act-showcase-page.js, the cinematic enhancer and the display
// normalizer). They were compared on these inputs and agreed everywhere except surrounding whitespace, which
// the enhancer copy did not trim (every value it saw had already been trimmed). This table pins the single rule.
const CASES = [
  ["“名前”", "“名前”"],
  ["““名前””", "“名前”"],
  ['"“名前”"', '"“名前”"'],
  ["「“名前”」", "「“名前”」"],
  ["“ハンドル” 名前", "“ハンドル” 名前"],
  ["““ハンドル”” 名前", "“ハンドル” 名前"],
  ["““テスト”” 名前", "“テスト” 名前"],
  ["“““x”””  y", "“x”  y"],
  ["名前", "名前"],
  ["", ""],
  ["  “名前”  ", "“名前”"],
  ["　“名前”　", "“名前”"],
  [undefined, ""],
  [null, ""]
];

test("the single display-quote rule gives the pinned result for every input", () => {
  for (const [input, expected] of CASES) {
    assert.equal(normalizeShowcaseDisplayQuotes(input), expected, JSON.stringify(input));
  }
});

test("names and readings of the public showcases on disk come out unchanged and stable", async () => {
  const files = (await readdir(new URL("../showcases/", import.meta.url))).filter(name => name.endsWith(".html"));
  const values = [];
  for (const file of files) {
    const html = await read(`showcases/${file}`);
    for (const match of html.matchAll(/class="cast-card__(?:name|reading)[^"]*">([^<]*)</g)) {
      values.push(match[1].replaceAll("&quot;", '"').trim());
    }
  }
  assert.ok(values.length >= 8, "expected the real names and readings to be found");
  for (const value of values) {
    const once = normalizeShowcaseDisplayQuotes(value);
    assert.equal(once, value, `real name changed: ${value}`);
    assert.equal(normalizeShowcaseDisplayQuotes(once), once);
  }
});

test("the rule exists once; every path normalizes names when it reads the data", async () => {
  const [page, standard, standardGuests, supporting, enhancer, displayNormalizer] = await Promise.all([
    read("js/act-showcase-page.js"),
    read("js/act-showcase-standard.js"),
    read("js/act-showcase-standard-guests.js"),
    read("js/act-showcase-supporting-cast.js"),
    read("js/act-showcase-cinematic-enhancer.js"),
    read("js/act-showcase-display-normalizer.js")
  ]);
  // No second copy of the rule next to the single one in showcase-display-format.js.
  for (const [name, source] of Object.entries({ page, standard, standardGuests, supporting, enhancer, displayNormalizer })) {
    assert.doesNotMatch(source, /replace\(\/“\\s\*\[“/, `${name} still carries its own quote rule`);
  }
  assert.match(page, /fullName: normalizeShowcaseDisplayQuotes\(/);
  assert.match(page, /reading: normalizeShowcaseDisplayQuotes\(/);
  assert.match(standard, /fullName: normalizeShowcaseDisplayQuotes\(/);
  assert.match(standard, /reading: normalizeShowcaseDisplayQuotes\(/);
  assert.match(standardGuests, /displayName: normalizeShowcaseDisplayQuotes\(/);
  assert.match(supporting, /displayName: normalizeShowcaseDisplayQuotes\(/);
  // The observers that used to rewrite names afterwards are gone.
  assert.doesNotMatch(enhancer, /normalizeVisibleQuotes|normalizeDuplicateHandleQuotes/);
  assert.doesNotMatch(displayNormalizer, /NAME_SELECTORS|normalizeShowcaseDisplayQuotes/);
});
