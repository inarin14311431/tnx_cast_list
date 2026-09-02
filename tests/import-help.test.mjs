import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('data import uses direct character-sheets URL and global help', async () => {
  const source = await read('js/sheet-import-url.js');
  assert.match(source, /character-sheets\.appspot\.com/);
  assert.match(source, /\/tnx\/display/);
  assert.match(source, /legacy-import-json/);
  assert.match(source, /legacy-import-apply/);
  assert.match(source, /help-ui\.js/);
  assert.doesNotMatch(source, /MutationObserver/);

  const helpUi = await read('js/help-ui.js');
  assert.match(helpUi, /sheet-global-help/);
  assert.match(helpUi, /help-content\.js\?v=3/);
  assert.doesNotMatch(helpUi, /sheet-import-help\.js/);

  const helpCss = await read('css-next/components/help.css');
  assert.match(helpCss, /transform: translateY\(-2px\)/);

  const helpContent = await read('js/help-content.js');
  assert.match(helpContent, /importData/);
  assert.match(helpContent, /キャラクターシート倉庫/);
  assert.match(helpContent, /PC・スマートフォンとも同じ手順/);
  assert.match(helpContent, /comparison/);
  assert.match(helpContent, /倉庫との差分比較/);
  assert.match(helpContent, /取込は単純な追加ではありません/);
  assert.match(helpContent, /能力値・制御値・CS/);
  assert.doesNotMatch(helpContent, /masterData|マスタ|SKD|OFC/);
  assert.match(helpContent, /A4縦の複数ページ/);
});

test('sidebar action rails follow the active theme tokens', async () => {
  const source = await read('js/sheet-sidebar-actions.js');
  assert.match(source, /action: 'var\(--color-accent\)'/);
  assert.match(source, /save: 'var\(--color-success\)'/);
  assert.doesNotMatch(source, /#35d7ff|#70efa9/);
});
