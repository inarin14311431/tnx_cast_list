import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sheetHtml = fs.readFileSync(new URL('../sheet.html', import.meta.url), 'utf8');
const mobileSheetHtml = fs.readFileSync(new URL('../sheet-mobile.html', import.meta.url), 'utf8');
const sheetJs = fs.readFileSync(new URL('../js/sheet.js', import.meta.url), 'utf8');
const castJs = fs.readFileSync(new URL('../js/cast.js', import.meta.url), 'utf8');
const mobileCastJs = fs.readFileSync(new URL('../js/cast-mobile.js', import.meta.url), 'utf8');
const mobileProfileJs = fs.readFileSync(new URL('../js/sheet-mobile-profile.js', import.meta.url), 'utf8');
const sheetImportJs = fs.readFileSync(new URL('../js/sheet-import.js', import.meta.url), 'utf8');
const mobileProfileCss = fs.readFileSync(new URL('../css-next/pages/sheet-mobile-profile.css', import.meta.url), 'utf8');

const paths = [
  ['origin', 'life_path_origin'],
  ['experience', 'life_path_experience'],
  ['encounter', 'life_path_encounter']
];

test('PC and mobile editors keep exactly one input for each of the three life paths', () => {
  for (const [suffix, field] of paths) {
    assert.equal((sheetHtml.match(new RegExp(`id="life-path-${suffix}"`, 'g')) || []).length, 1);
    assert.equal((mobileSheetHtml.match(new RegExp(`data-mobile-character-field="${field}"`, 'g')) || []).length, 1);
    assert.match(sheetJs, new RegExp(`\\["${field}", "#life-path-${suffix}"\\]`));
  }
});

test('PC and mobile cast views render the three stored life path values directly', () => {
  for (const [, field] of paths) {
    assert.match(castJs, new RegExp(`character\\.${field}`));
    assert.match(mobileCastJs, new RegExp(`c\\.${field}`));
  }
  assert.doesNotMatch(castJs, /取得技能なし|splitLifePath/);
  assert.doesNotMatch(mobileCastJs, /取得技能なし|splitLifePath/);
});

test('mobile profile summary and editor never split life path name and acquired skill', () => {
  assert.doesNotMatch(mobileProfileJs, /取得技能なし|splitLifePath|joinLifePath/);
  assert.match(mobileProfileJs, /const value=String\(source\(field\)\?\.value\|\|""\)\.trim\(\)/);
  assert.match(mobileProfileJs, /mobile-lifepath-row"><b>\$\{bilingual\(label,en\)\}<\/b><span>\$\{esc\(value\|\|"—"\)\}<\/span>/);
  assert.match(mobileProfileJs, /<label class="mobile-lifepath-editor"[^>]*><span class="mobile-profile-field-label">/);
});

test('mobile life path layout is label plus one value cell', () => {
  assert.match(mobileProfileCss, /\.mobile-lifepath-row\{display:grid;grid-template-columns:48px minmax\(0,1fr\)/);
  assert.doesNotMatch(mobileProfileCss, /\.mobile-lifepath-row\{[^}]*grid-template-columns:48px minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.doesNotMatch(mobileProfileCss, /\.mobile-lifepath-row>span:last-child/);
});

test('legacy import writes each life path category into one field only', () => {
  for (const [suffix] of paths) {
    assert.equal((sheetImportJs.match(new RegExp(`setElement\\('#life-path-${suffix}'`, 'g')) || []).length, 1);
  }
  assert.doesNotMatch(sheetImportJs, /life-path-(?:origin|experience|encounter)-(?:name|skill)/);
});
