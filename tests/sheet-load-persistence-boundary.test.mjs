import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sheetSource = await readFile(new URL("../js/sheet.js", import.meta.url), "utf8");
const loadSource = await readFile(new URL("../js/sheet-load-persistence.js", import.meta.url), "utf8");
const normalizationSource = await readFile(new URL("../js/sheet-load-normalization.js", import.meta.url), "utf8");

test("classic sheet delegates character bundle reads to the load persistence boundary", () => {
  assert.match(sheetSource, /sheet-load-persistence\.js\?v=1/);
  assert.match(sheetSource, /loadSheetBundle\(\{ publicId, ownerId: user\.id \}\)/);
  assert.doesNotMatch(sheetSource, /supabase\.from\("characters"\)/);
  assert.doesNotMatch(sheetSource, /supabase\.from\("character_skills"\)/);
  assert.doesNotMatch(sheetSource, /supabase\.from\("character_outfits"\)/);
});

test("load persistence owns the authenticated three-table read contract", () => {
  assert.match(loadSource, /export async function loadSheetBundle/);
  assert.match(loadSource, /\.from\("characters"\)/);
  assert.match(loadSource, /\.eq\("public_id", normalizedPublicId\)/);
  assert.match(loadSource, /\.eq\("owner_id", normalizedOwnerId\)/);
  assert.match(loadSource, /\.from\("character_skills"\)/);
  assert.match(loadSource, /\.from\("character_outfits"\)/);
  assert.match(loadSource, /\.eq\("character_id", character\.id\)\.order\("sort_order"\)/);
  assert.match(loadSource, /return Object\.freeze\(\{/);
});

test("load persistence rejects missing identity and propagates related-table failures", () => {
  assert.match(loadSource, /if \(!normalizedPublicId \|\| !normalizedOwnerId\) throw new Error/);
  assert.match(loadSource, /if \(!character\) throw new Error/);
  assert.match(loadSource, /const relatedError = skillResult\.error \|\| outfitResult\.error/);
  assert.match(loadSource, /if \(relatedError\) throw relatedError/);
});

test("classic sheet routes loaded records through the DOM-free normalization boundary", () => {
  assert.match(sheetSource, /sheet-load-normalization\.js\?v=1/);
  assert.match(sheetSource, /normalizeLoadedSkill\(/);
  assert.match(sheetSource, /bundle\.outfits\.map\(normalizeLoadedOutfit\)/);
  assert.match(normalizationSource, /export function normalizeLoadedSkill/);
  assert.match(normalizationSource, /export function normalizeLoadedOutfit/);
  assert.doesNotMatch(normalizationSource, /document\.|querySelector|window\.|supabase/);
  assert.doesNotMatch(sheetSource, /function normalizeSkill\s*\(/);
  assert.doesNotMatch(sheetSource, /function normalizeOutfit\s*\(/);
});
