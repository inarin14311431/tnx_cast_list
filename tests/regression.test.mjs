import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('editor sidebar removes viewer-only VTT exports but keeps bookmarklet transfer actions', async () => {
  const source = await read('js/sheet-sidebar-actions.js');
  assert.match(source, /const VIEWER_ONLY_ACTION = \/ココフォリア\|ユドナリウム\//);
  assert.doesNotMatch(source, /VIEWER_ONLY_ACTION[^\n]*転記TSV|VIEWER_ONLY_ACTION[^\n]*転記BM/);
  assert.match(source, /const ordered = \[visibility, save, view, transferTsv, transferBm, importAction, autofill\]/);
});

test('editor sidebar reorder is idempotent and does not observe its own attributes', async () => {
  const source = await read('js/sheet-sidebar-actions.js');
  assert.match(source, /current\.length === ordered\.length/);
  assert.match(source, /current\.every\(\(child, index\) => child === ordered\[index\]\)/);
  assert.doesNotMatch(source, /attributeFilter:\s*\['hidden', 'class', 'id'\]/);
  assert.match(source, /new MutationObserver\(queueArrange\)\.observe\(panel, \{\s*childList: true,\s*subtree: true\s*\}\)/s);
});

test('editor help is exposed through one global trigger', async () => {
  const source = await read('js/help-ui.js');
  assert.match(source, /sheet-global-help/);
  assert.doesNotMatch(source, /installSidebarHelp|installSectionHelp|installImageHelp|installComboHelp/);
});

test('retired compatibility scripts are no longer loaded', async () => {
  const html = await read('sheet.html');
  assert.doesNotMatch(html, /sheet-json-import-repair\.js/);
  assert.doesNotMatch(html, /style-skill-recovery\.js/);
  assert.doesNotMatch(html, /style-skill-import-integrity-fix\.js/);
  assert.doesNotMatch(html, /sheet-master-search-dash-fix\.js/);
  assert.doesNotMatch(html, /outfit-ofc-tsv-category-fix\.js/);
  assert.match(html, /style-skill-detail-integrity\.js/);
  assert.match(html, /sheet-master-search-access\.js/);
});

test('style import compatibility owns JSON repair and preserves symbols', async () => {
  const source = await read('js/sheet-import-style-skill-compat.js');
  assert.match(source, /replace\(\/\^\[★■┗†※\]\+\\s\*\//);
  assert.match(source, /function setExactName\(row,value\)/);
  assert.match(source, /normalizeMultiline\(value\)/);
  assert.match(source, /setExactName\(row,data\.name\)/);
  assert.match(source, /repairJsonStringControls/);
  assert.match(source, /removeUnexpectedRows/);
});

test('style detail integrity is separated from import compatibility', async () => {
  const source = await read('js/style-skill-detail-integrity.js');
  assert.match(source, /structured style-skill detail payloads canonical/);
  assert.match(source, /function decodeDetail/);
  assert.match(source, /function repairRow/);
  assert.doesNotMatch(source, /legacy-import-message|removeUnexpectedRows|TNXLegacyStyleSkillRepair/);
});

test('zero style skills remain a valid editor state without recovery shim', async () => {
  const html = await read('sheet.html');
  assert.doesNotMatch(html, /style-skill-recovery\.js/);

  const sheet = await read('js/sheet.js');
  assert.match(sheet, /#add-style-skill/);
  assert.match(sheet, /addSkill\("style", "normal", ""\)/);
});

test('master search enhancements are loaded directly and separated by responsibility', async () => {
  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /import "\.\/sheet-master-search-enhancements\.js"/);

  const entry = await read('js/sheet-master-search-enhancements.js');
  assert.match(entry, /sheet-master-search-result-ui\.js/);
  assert.match(entry, /sheet-master-search-ofc-normalize\.js/);
  assert.match(entry, /sheet-master-search-bs-tooltips\.js/);
  assert.match(entry, /sheet-master-search-auto-run\.js/);

  const resultUi = await read('js/sheet-master-search-result-ui.js');
  assert.match(resultUi, /master-search-details-toggle/);
  assert.doesNotMatch(resultUi, /purchase_value|restoreDash|can_use_master_search/);

  const ofc = await read('js/sheet-master-search-ofc-normalize.js');
  assert.match(ofc, /purchase_value/);
  assert.match(ofc, /restoreDash/);
  assert.doesNotMatch(ofc, /master-search-details-toggle|can_use_master_search/);
});

test('master search automatically reruns when classification filters change', async () => {
  const source = await read('js/sheet-master-search-auto-run.js');
  assert.match(source, /master-search-filter-primary/);
  assert.match(source, /master-search-filter-secondary/);
  assert.match(source, /addEventListener\("change"/);
  assert.match(source, /master-search-run/);
  assert.match(source, /runButton\.click\(\)/);
  assert.doesNotMatch(source, /supabase|skd_master|ofc_master/);
});

test('save failures expose a diagnostic module with database metadata', async () => {
  const source = await read('js/sheet-save-diagnostics.js');
  assert.match(source, /save_character_bundle/);
  assert.match(source, /\.code/);
  assert.match(source, /\.details/);
  assert.match(source, /\.hint/);
  for (const code of ['23502', '23505', '23514', '22001', '42501']) assert.match(source, new RegExp(code));
});

test('OFC responsibilities keep import compatibility, TSV normalization and display separate', async () => {
  const compat = await read('js/sheet-import-outfit-compat.js');
  assert.match(compat, /legacy-import-apply/);
  assert.match(compat, /sourceOutfits/);

  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /import "\.\/outfit-ofc-tsv-category-normalize\.js"/);

  const category = await read('js/outfit-ofc-tsv-category-normalize.js');
  assert.match(category, /function restoreCategories/);
  assert.match(category, /targetToCategory/);
  assert.doesNotMatch(category, /legacy-import-apply|save_character_bundle/);

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

test('OFC TSV transfer is isolated from field rendering', async () => {
  const tsv = await read('js/outfit-ofc-tsv.js');
  assert.match(tsv, /function handleMasterCopy/);
  assert.match(tsv, /function handleTsvImport/);
  assert.match(tsv, /function createFullOfcTsv/);
  assert.match(tsv, /function parseTsv/);
  assert.match(tsv, /outfit-ofc-utils\.js/);
  assert.doesNotMatch(tsv, /save_character_bundle_with_ofc|CATEGORY_FIELDS|enhanceTable/);

  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /import "\.\/outfit-ofc-tsv\.js(?:\?[^\"]+)?"/);

  const fields = await read('js/outfit-ofc-fields.js');
  assert.doesNotMatch(fields, /handleMasterCopy|handleTsvImport|createFullOfcTsv|parseTsv|toTsv|TSV_EXTRA_HEADERS/);
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

  for (const modulePath of ['js/outfit-ofc-save.js', 'js/outfit-ofc-fields.js', 'js/outfit-ofc-tsv.js', 'js/outfit-ofc-master-apply.js']) {
    const source = await read(modulePath);
    assert.match(source, /outfit-ofc-utils\.js/);
  }
});
