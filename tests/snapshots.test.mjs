import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('snapshot storage is capped at ten generations', async () => {
  const sql = await read('supabase/11_character_snapshots.sql');
  assert.match(sql, /create table if not exists public\.character_snapshots/);
  assert.match(sql, /create_character_snapshot/);
  assert.match(sql, /offset 10/);
  assert.match(sql, /snapshot_data jsonb/);
  assert.match(sql, /owner_id = auth\.uid\(\)/);
});

test('snapshot restore reuses transactional character save', async () => {
  const sql = await read('supabase/11_character_snapshots.sql');
  assert.match(sql, /restore_character_snapshot/);
  assert.match(sql, /save_character_bundle\(v_snapshot\.character_id, v_character, v_skills, v_outfits\)/);
});

test('snapshot UI supports create restore and delete without image duplication', async () => {
  const source = await read('js/sheet-snapshots.js');
  assert.match(source, /MAX_SNAPSHOTS = 10/);
  assert.match(source, /create_character_snapshot/);
  assert.match(source, /restore_character_snapshot/);
  assert.match(source, /character_snapshots/);
  assert.doesNotMatch(source, /storage\.from|upload|image blob/i);

  const html = await read('sheet.html');
  assert.match(html, /sheet-snapshots\.js/);
});

test('snapshot creation is blocked while the sheet has unsaved changes', async () => {
  const source = await read('js/sheet-snapshots.js');
  assert.match(source, /hasUnsavedSheetChanges/);
  assert.match(source, /from "\.\/sheet-save-state\.js(?:\?[^\"]+)?"/);
  assert.doesNotMatch(source, /function hasUnsavedChanges\(\)/);
  assert.doesNotMatch(source, /classList\.contains\("unsaved"\)/);
  assert.doesNotMatch(source, /未保存\|NOT SAVED/);
  assert.match(source, /先にキャストを保存してからスナップショットを作成してください/);
  assert.match(source, /alert\(warning\)/);
  assert.match(source, /focusSheetSaveButton\(\)/);
});

test('snapshot panel follows active theme tokens', async () => {
  const css = await read('css-next/components/sheet-snapshots.css');
  assert.match(css, /var\(--color-text\)/);
  assert.match(css, /var\(--color-accent\)/);
  assert.match(css, /var\(--color-danger\)/);
  assert.match(css, /var\(--color-success\)/);
  assert.match(css, /var\(--color-surface-alt\)/);
  assert.doesNotMatch(css, /rgba\(117,225,255|#35d7ff|#70efa9/);
});
