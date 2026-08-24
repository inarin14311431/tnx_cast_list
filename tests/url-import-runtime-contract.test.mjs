import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("supabase client does not load retired transfer TSV module", async () => {
  const source = await read("js/supabase-client.js");
  assert.doesNotMatch(source, /transfer-tsv-export\.js/);
});

test("character-sheets URL import provides multiple JSONP endpoint candidates", async () => {
  const source = await read("js/sheet-import-url.js");
  assert.match(source, /VERSION='1\.5\.2'/);
  assert.match(source, /\/tnx\/display\?ajax=1&key=/);
  assert.match(source, /\/tnx\/display\.html\?ajax=1&key=/);
  assert.match(source, /async function fetchJsonp\(key\)/);
  assert.match(source, /character-sheets JSONP endpoints failed/);
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
