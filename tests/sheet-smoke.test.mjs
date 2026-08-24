import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function indexOfOrFail(source, token) {
  const index = source.indexOf(token);
  assert.notEqual(index, -1, `missing token: ${token}`);
  return index;
}

test('sheet keeps the requested sidebar action order', async () => {
  const html = await read('sheet.html');
  const visibility = indexOfOrFail(html, 'id="visibility"');
  const save = indexOfOrFail(html, 'id="save-button"');
  const view = indexOfOrFail(html, 'id="cast-view-button"');
  const legacyImport = indexOfOrFail(html, 'id="legacy-import-open"');

  // Dynamic autofill is appended after import by sheet-sidebar-actions.js.
  assert.ok(visibility < save, 'visibility must precede save');
  assert.ok(save < legacyImport, 'save must precede import in source markup');
  assert.ok(view > save, 'view must appear after save');
});

test('viewer-only transfer actions are not part of editor markup', async () => {
  const html = await read('sheet.html');
  for (const label of ['ココフォリア', 'ユドナリウム', '転記TSV', '転記BM']) {
    assert.doesNotMatch(html, new RegExp(label));
  }
});

test('editor keeps the character load path and ownership filter', async () => {
  const source = await read('js/sheet.js');
  const load = await read('js/sheet-load-persistence.js');
  assert.match(source, /async function loadCharacter\(publicId\)/);
  assert.match(source, /loadSheetBundle\(\{ publicId, ownerId: user\.id \}\)/);
  assert.doesNotMatch(source, /supabase\.from\s*\(/);
  assert.match(load, /\.from\("characters"\)/);
  assert.match(load, /\.eq\("public_id", normalizedPublicId\)/);
  assert.match(load, /\.eq\("owner_id", normalizedOwnerId\)/);
  assert.match(load, /Promise\.all\(\[/);
  assert.match(load, /character_skills/);
  assert.match(load, /character_outfits/);
});

test('critical editor modules are still loaded', async () => {
  const html = await read('sheet.html');
  for (const path of [
    './js/sheet.js',
    './js/sheet-import.js',
    './js/sheet-import-style-skill-compat.js',
    './js/sheet-import-outfit-compat.js',
    './js/sheet-sidebar-actions.js',
    './js/sheet-section-nav.js',
    './js/sheet-combos.js'
  ]) {
    assert.match(html, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('global help is loaded from section navigation and only one trigger is created', async () => {
  const nav = await read('js/sheet-section-nav.js');
  const help = await read('js/help-ui.js');
  assert.match(nav, /help-ui\.js/);
  assert.equal((help.match(/id = "sheet-global-help"/g) || []).length, 1);
});
