import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLegacyDefense } from '../js/outfit-legacy-compat.js';
import {
  categoryToTarget,
  defenseText,
  outfitSignature,
  parseDefense,
  targetToCategory
} from '../js/outfit-ofc-utils.js';

test('OFC category conversion keeps editor categories stable', () => {
  assert.equal(targetToCategory('weapons'), 'weapon');
  assert.equal(targetToCategory('armours'), 'armor');
  assert.equal(targetToCategory('サイバーウェア'), 'cyberware');
  assert.equal(targetToCategory('トロン'), 'tron');
  assert.equal(categoryToTarget('weapon'), 'weapons');
  assert.equal(categoryToTarget('armor'), 'armours');
  assert.equal(categoryToTarget('cyberware'), 'outfits');
});

test('OFC defense parsing and formatting preserves S P I values', () => {
  assert.deepEqual(parseDefense('S12/P9/I7'), {
    defense_s: '12',
    defense_p: '9',
    defense_i: '7'
  });
  assert.deepEqual(parseDefense('12/7/9'), {
    defense_s: '12',
    defense_p: '9',
    defense_i: '7'
  });
  assert.equal(defenseText({ defense_s: '12', defense_p: '9', defense_i: '7' }), 'S12/P9/I7');
});

test('shared legacy defense parser keeps source-specific unlabeled order explicit', () => {
  assert.deepEqual(parseLegacyDefense('12/9/7'), {
    defense_s: '12',
    defense_p: '9',
    defense_i: '7'
  });
  assert.deepEqual(parseLegacyDefense('12/7/9', 'sip'), {
    defense_s: '12',
    defense_p: '9',
    defense_i: '7'
  });
});

test('OFC row signature distinguishes category and name', () => {
  assert.equal(outfitSignature('armor', 'テスト防具'), 'armor\u0000テスト防具');
  assert.notEqual(outfitSignature('weapon', '同名'), outfitSignature('armor', '同名'));
});
