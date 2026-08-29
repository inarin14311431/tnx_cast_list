import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

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
