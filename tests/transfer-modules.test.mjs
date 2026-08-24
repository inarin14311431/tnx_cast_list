import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('transfer bookmarklet loads responsibility modules instead of numbered fixes', async () => {
  const loader = await read('js/tnx-transfer-bookmarklet.js');
  for (const name of [
    'tnx-transfer-common.js',
    'tnx-transfer-social-connection.js',
    'tnx-transfer-style-skills.js',
    'tnx-transfer-general-skills.js'
  ]) assert.match(loader, new RegExp(name.replaceAll('.', '\\.')));

  assert.doesNotMatch(loader, /tnx-transfer-bookmarklet-fixes-v[345]\.js/);
  assert.match(loader, /repairSocialConnection\(data\)/);
  assert.match(loader, /repairStyleSkills\(data\)/);
  assert.match(loader, /repairGeneralSkills\(data\)/);
  assert.match(loader, /repairStyleSeparators\(data\)/);
});

test('transfer common module owns shared TSV and legacy suit helpers', async () => {
  const common = await read('js/tnx-transfer-common.js');
  assert.match(common, /function parse\(/);
  assert.match(common, /function ensureRows\(/);
  assert.match(common, /function setLegacySuit\(/);
  assert.match(common, /TNXTransferRepairCommon/);
});

test('social and connection transfer module is isolated from style and general mapping', async () => {
  const source = await read('js/tnx-transfer-social-connection.js');
  assert.match(source, /repairSocialConnection/);
  assert.match(source, /skills3/);
  assert.match(source, /skills4/);
  assert.doesNotMatch(source, /superhumanskills|const FIXED|STYLE_SEPARATOR/);
});

test('general skill transfer module owns fixed skill mapping and proper skills', async () => {
  const source = await read('js/tnx-transfer-general-skills.js');
  assert.match(source, /const FIXED/);
  assert.match(source, /製作/);
  assert.match(source, /芸術/);
  assert.match(source, /操縦/);
  assert.match(source, /repairGeneralSkills/);
  assert.doesNotMatch(source, /superhumanskills|STYLE_SEPARATOR/);
});

test('style skill transfer module owns style rows and separator repair', async () => {
  const source = await read('js/tnx-transfer-style-skills.js');
  assert.match(source, /superhumanskills/);
  assert.match(source, /\[\[STYLE_SEPARATOR\]\]/);
  assert.match(source, /repairStyleSkills/);
  assert.match(source, /repairStyleSeparators/);
  assert.doesNotMatch(source, /skills3|skills4|const FIXED/);
});
