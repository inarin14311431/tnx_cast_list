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

test('retired compatibility scripts and privileged master scripts are not statically loaded', async () => {
  const html = await read('sheet.html');
  assert.doesNotMatch(html, /sheet-json-import-repair\.js/);
  assert.doesNotMatch(html, /style-skill-recovery\.js/);
  assert.doesNotMatch(html, /style-skill-import-integrity-fix\.js/);
  assert.doesNotMatch(html, /sheet-master-search-dash-fix\.js/);
  assert.doesNotMatch(html, /outfit-ofc-tsv-category-fix\.js/);
  assert.match(html, /style-skill-detail-integrity\.js/);
  assert.match(html, /privileged-tools-bootstrap\.js/);
  assert.doesNotMatch(html, /sheet-master-search-access\.js|sheet-master-search\.js|sheet-master-autofill\.js/);
});
