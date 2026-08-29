import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('master search enhancements remain separated by responsibility', async () => {
  const access = await read('js/sheet-master-search-access.js');
  assert.match(access, /import "\.\/sheet-master-search-enhancements\.js"/);
  assert.doesNotMatch(access, /outfit-ofc-tsv|tsv-category-normalize/);

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
