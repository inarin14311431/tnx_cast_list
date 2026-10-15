import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
const loadSource = await readFile(new URL("../js/sheet-load-persistence.js", import.meta.url), "utf8");
const normalizationSource = await readFile(new URL("../js/sheet-load-normalization.js", import.meta.url), "utf8");

test("classic sheet delegates character bundle reads to the load persistence boundary", () => {
  assert.match(sheetSource, /sheet-load-persistence\.js\?v=\d+/);
  assert.match(sheetSource, /loadSheetBundle\(\{ publicId, ownerId: user\.id \}\)/);
  assert.doesNotMatch(sheetSource, /supabase\.from\("characters"\)/);
  assert.doesNotMatch(sheetSource, /supabase\.from\("character_skills"\)/);
  assert.doesNotMatch(sheetSource, /supabase\.from\("character_outfits"\)/);
});

test("load persistence owns the authenticated three-table read contract in one embedded select", () => {
  assert.match(loadSource, /export async function loadSheetBundle/);
  assert.match(loadSource, /\.from\("characters"\)/);
  assert.match(loadSource, /\.select\("\*, character_skills\(\*\), character_outfits\(\*\)"\)/);
  assert.match(loadSource, /\.eq\("public_id", normalizedPublicId\)/);
  assert.match(loadSource, /\.eq\("owner_id", normalizedOwnerId\)/);
  assert.match(loadSource, /\.order\("sort_order", \{ referencedTable: "character_skills" \}\)/);
  assert.match(loadSource, /\.order\("sort_order", \{ referencedTable: "character_outfits" \}\)/);
  assert.doesNotMatch(loadSource, /\.from\("character_(skills|outfits)"\)/);
  assert.match(loadSource, /return Object\.freeze\(\{/);
});

test("load persistence returns a bare character row without the embedded arrays", async () => {
  const calls = globalThis.__loadCalls = [];
  const row = { id: "c1", public_id: "p1", character_skills: [{ id: "s1" }], character_outfits: null };
  const builder = {
    select(columns) { calls.push(["select", columns]); return builder; },
    eq(column, value) { calls.push(["eq", column, value]); return builder; },
    order(column, options) { calls.push(["order", column, options]); return builder; },
    maybeSingle: async () => ({ data: row, error: null })
  };
  globalThis.__loadBuilder = builder;
  const source = loadSource.replace('import { supabase } from "./supabase-client.js";', "const supabase = { from: table => { globalThis.__loadCalls.push(['from', table]); return globalThis.__loadBuilder; } };");
  const { loadSheetBundle } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const bundle = await loadSheetBundle({ publicId: " p1 ", ownerId: "u1" });
  assert.deepEqual(bundle.character, { id: "c1", public_id: "p1" });
  assert.deepEqual(bundle.skills, [{ id: "s1" }]);
  assert.deepEqual(bundle.outfits, []);
  assert.equal(calls.filter(call => call[0] === "from").length, 1);
});

test("load persistence rejects missing identity and propagates the single read failure", () => {
  assert.match(loadSource, /if \(!normalizedPublicId \|\| !normalizedOwnerId\) throw new Error/);
  assert.match(loadSource, /if \(!data\) throw new Error/);
  assert.match(loadSource, /if \(error\) throw error/);
});

test("classic sheet routes loaded records through the DOM-free normalization boundary", () => {
  assert.match(sheetSource, /sheet-load-normalization\.js\?v=\d+/);
  assert.match(sheetSource, /normalizeLoadedSkill\(/);
  assert.match(sheetSource, /bundle\.outfits\.map\(normalizeLoadedOutfit\)/);
  assert.match(normalizationSource, /export function normalizeLoadedSkill/);
  assert.match(normalizationSource, /export function normalizeLoadedOutfit/);
  assert.doesNotMatch(normalizationSource, /document\.|querySelector|window\.|supabase/);
  assert.doesNotMatch(sheetSource, /function normalizeSkill\s*\(/);
  assert.doesNotMatch(sheetSource, /function normalizeOutfit\s*\(/);
});
