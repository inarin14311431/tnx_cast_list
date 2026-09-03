import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const mobileSource = fs.readFileSync(new URL("../js/cast-mobile-level-labels.js", import.meta.url), "utf8");
const serviceSource = fs.readFileSync(new URL("../js/character-sheet-compare-service.js", import.meta.url), "utf8");
const linkCss = fs.readFileSync(new URL("../css-next/pages/cast-mobile-character-sheet-link.css", import.meta.url), "utf8");
const editorApp = fs.readFileSync(new URL("../js/sheet-mobile-app.js", import.meta.url), "utf8");
const editorCompare = fs.readFileSync(new URL("../js/sheet-mobile-character-sheet-compare.js", import.meta.url), "utf8");

test("mobile viewer exposes one underlined warehouse section link without comparison controls", () => {
  assert.match(mobileSource, /mobile-cast-source-heading-link/);
  assert.match(mobileSource, /link\.dataset\.characterSheetLink = "1"/);
  assert.match(mobileSource, /キャラクターシート倉庫を開く/);
  assert.match(mobileSource, /OPEN CHARACTER SHEETS/);
  assert.doesNotMatch(mobileSource, /mobile-cast-source-compare/);
  assert.doesNotMatch(mobileSource, /倉庫との差分を確認/);
  assert.doesNotMatch(mobileSource, /character-sheet-compare-service/);
  assert.match(linkCss, /\.mobile-cast-source-heading-link/);
  assert.match(linkCss, /text-decoration:\s*underline/);
});

test("mobile viewer removes the obsolete warehouse metadata row", () => {
  assert.match(mobileSource, /function removeMetaCharacterSheetLinks/);
  assert.match(mobileSource, /\.mobile-cast-meta > div/);
  assert.match(mobileSource, /label === "CHARACTER SHEET" \|\| label === "CHARACTER SHEETS"/);
  assert.match(mobileSource, /https:\/\/character-sheets\.appspot\.com/);
  assert.match(mobileSource, /url\.pathname\.startsWith\("\/tnx\/"\)/);
  assert.match(mobileSource, /if \(isCharacterSheetLabel \|\| hasCharacterSheetLink\) row\.remove\(\)/);
  assert.match(mobileSource, /removeMetaCharacterSheetLinks\(root\)/);
});

test("canonical comparison remains centralized in the shared service", () => {
  assert.doesNotMatch(mobileSource, /canonicalizeArchiveBundle/);
  assert.doesNotMatch(mobileSource, /canonicalizeCharacterSheetJsonp/);
  assert.doesNotMatch(mobileSource, /diffCanonicalBundles/);
  assert.match(serviceSource, /canonicalizeArchiveBundle/);
  assert.match(serviceSource, /canonicalizeCharacterSheetJsonp/);
  assert.match(serviceSource, /diffCanonicalBundles/);
});

test("source panel construction remains idempotent across viewer enhancement passes", () => {
  assert.match(mobileSource, /!section\.querySelector\("\.mobile-cast-source-panel"\)/);
  assert.match(mobileSource, /section\.dataset\.mobileProfileEnhanced = "1"/);
  assert.match(mobileSource, /section\?\.dataset\.mobileProfileEnhanced !== "1"/);
});

test("warehouse comparison is owned by the mobile editor", () => {
  assert.match(editorApp, /sheet-mobile-character-sheet-compare\.js\?v=1/);
  assert.match(editorCompare, /倉庫との差分を確認/);
  assert.match(editorCompare, /compareCharacterSheetSource/);
  assert.match(editorCompare, /data-mobile-profile-group=\"source\"/);
  assert.match(editorCompare, /data-mobile-profile-modal-field=\"character_sheet_url\"/);
  assert.doesNotMatch(editorCompare, /__tnxRefreshMobileCharacterSheetTools/);
});
