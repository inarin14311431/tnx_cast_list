import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("supabase client does not load retired transfer TSV module", async () => {
  const source = await read("js/supabase-client.js");
  assert.doesNotMatch(source, /transfer-tsv-export\.js/);
});

test("URL import and both comparisons use the data-only source transport", async () => {
  for (const file of ["js/sheet-import-url.js", "js/sheet-character-sheet-compare.js", "js/character-sheet-compare-service.js"]) {
    const source = await read(file);
    assert.match(source, /requestCharacterSheetSource/);
    assert.doesNotMatch(source, /jsonpOnce|fetchJsonp|script\.src/);
  }
});

test("URL import unwraps parenthesized jsonData used by character-sheets", async () => {
  const source = await read("js/sheet-import-url.js");
  assert.match(source, /function parseJsonData\(value\)/);
  assert.match(source, /source\.startsWith\('\('\)&&source\.endsWith\('\)'\)/);
  assert.match(source, /data\.jsonData/);
  assert.match(source, /mergeWrapperMetadata/);
  assert.match(source, /'outline','name','nameKana','player','display'/);
});

test("URL import can recover style names when only legacy style codes are returned", async () => {
  const source = await read("js/sheet-import-url.js");
  assert.match(source, /STYLE_CODE_NAMES/);
  assert.match(source, /\['11','カタナ'\]/);
  assert.match(source, /\['-21','ウツワ'\]/);
  assert.match(source, /data\.outline=`STYLE:\$\{names\.join\('='/);
  assert.match(source, /enrichLegacyStyles\(data\)/);
});

test("URL import strips legacy star display markers before free-level mapping", async () => {
  const source = await read("js/sheet-import-url.js");
  assert.match(source, /function stripLegacyStarSkillMarkers\(data\)/);
  assert.match(source, /\/skill\/i\.test\(key\)/);
  assert.match(source, /replace\(\/\^\\s\*★\\s\*\/,' '\)|replace\(\/\^\\s\*★\\s\*\/,''\)/);
  assert.match(source, /data=stripLegacyStarSkillMarkers\(data\)/);
});
test("style import repair prefers direct source skill arrays before flattened fallback", async () => {
  const source = await read("js/sheet-import-style-skill-compat.js");
  assert.ok(source.includes("function sourceRecords(data)"));
  assert.ok(source.includes("if(Array.isArray(data?.[key]))direct.push(...data[key])"));
  assert.ok(source.includes("return sourceRecords(data)"));
});
