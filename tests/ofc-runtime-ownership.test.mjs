import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('OFC responsibilities keep legacy import compatibility and display separate from privileged master tools', async () => {
  const compat = await read('js/sheet-import-outfit-compat.js');
  assert.match(compat, /legacy-import-apply/);
  assert.match(compat, /sourceOutfits/);

  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /outfit-ofc-master-apply\.js/);
  assert.doesNotMatch(access, /outfit-ofc-tsv|tsv-category-normalize/);

  const display = await read('js/outfit-display-rules-v5.js');
  assert.match(display, /const LAYOUTS/);
  assert.match(display, /applySheetLayouts/);
  assert.doesNotMatch(display, /save_character_bundle|legacy-import-apply/);
});

test('OFC save projection is owned by the DOM-free payload contract', async () => {
  const payload = await read('js/sheet-save-payload.js');
  const persistence = await read('js/sheet-save-persistence.js');
  assert.match(payload, /function buildOutfitDetails/);
  assert.match(payload, /ofc_details:\s*buildOutfitDetails/);
  assert.doesNotMatch(payload, /document\.|querySelector|TNXOutfitOFCState/);
  assert.match(persistence, /save_character_bundle_with_ofc/);
  assert.doesNotMatch(persistence, /enrichOutfitPayload|outfit-ofc-save/);

  const fields = await read('js/outfit-ofc-fields.js');
  assert.doesNotMatch(fields, /BASE_SAVE_RPC|OFC_SAVE_RPC|wrapSaveRpc|enrichOutfitPayload|__tnxOfcSaveWrapped/);
});

test('retired OFC TSV import is not reachable from the editor or privileged loader', async () => {
  const [sheet, privileged, access] = await Promise.all([
    read('js/sheet.js'),
    read('js/sheet-privileged-tools.js'),
    read('js/sheet-master-search-access.js')
  ]);
  assert.doesNotMatch(sheet, /sheet-tsv-import|parseSheetTsv|openTsvImport/);
  assert.doesNotMatch(privileged, /outfit-ofc-tsv|tsv-import-guide|TSV取込/);
  assert.doesNotMatch(access, /outfit-ofc-tsv|tsv-category-normalize/);
});

test('OFC master application is isolated from field rendering', async () => {
  const apply = await read('js/outfit-ofc-master-apply.js');
  assert.match(apply, /function handleMasterAdd/);
  assert.match(apply, /function applyMasterRowsAfterBaseAdd/);
  assert.match(apply, /masterRowToOutfitDetails/);
  assert.match(apply, /outfit-ofc-adapter\.js/);
  assert.doesNotMatch(apply, /function masterRowDetails/);
  assert.match(apply, /outfit-ofc-utils\.js/);
  assert.doesNotMatch(apply, /save_character_bundle_with_ofc|handleTsvImport|CATEGORY_FIELDS|enhanceTable/);

  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /import "\.\/outfit-ofc-master-apply\.js(?:\?[^\"]+)?"/);

  const fields = await read('js/outfit-ofc-fields.js');
  assert.doesNotMatch(fields, /handleMasterAdd|applyMasterRowsAfterBaseAdd|fetchMasterRows|masterRowDetails|masterRowToOutfitDetails/);
});

test('OFC shared utilities own category, defense and signature rules', async () => {
  const utils = await read('js/outfit-ofc-utils.js');
  assert.match(utils, /export function targetToCategory/);
  assert.match(utils, /export function categoryToTarget/);
  assert.match(utils, /export function parseDefense/);
  assert.match(utils, /export function defenseText/);
  assert.match(utils, /export function outfitSignature/);

  for (const modulePath of ['js/outfit-ofc-save.js', 'js/outfit-ofc-fields.js', 'js/outfit-ofc-master-apply.js']) {
    const source = await read(modulePath);
    assert.match(source, /outfit-ofc-utils\.js/);
  }
});
