import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOutfitSavePayloads } from '../js/sheet-save-payload.js';
import { normalizeOutfitForView } from '../js/outfit-view-model.js';

test('outfit save payload never emits retired defense or mundane_modifier columns', () => {
  const [record] = buildOutfitSavePayloads([{
    category: 'armor',
    name: 'TEST ARMOR',
    defense: '1/2/3',
    mundane_modifier: 9,
    defense_s: '4',
    defense_p: '5',
    defense_i: '6'
  }]);

  assert.equal(Object.hasOwn(record, 'defense'), false);
  assert.equal(Object.hasOwn(record, 'mundane_modifier'), false);
  assert.equal(record.ofc_details.defense_s, '4');
  assert.equal(record.ofc_details.defense_p, '5');
  assert.equal(record.ofc_details.defense_i, '6');
});

test('view model does not recover defense values from retired top-level defense column', () => {
  const legacyOnly = normalizeOutfitForView({
    category: 'armor',
    defense: '1/2/3',
    ofc_details: {}
  });
  assert.equal(legacyOnly.defense_s, '');
  assert.equal(legacyOnly.defense_p, '');
  assert.equal(legacyOnly.defense_i, '');

  const canonical = normalizeOutfitForView({
    category: 'armor',
    defense: '1/2/3',
    ofc_details: { defense_s: '4', defense_p: '5', defense_i: '6' }
  });
  assert.equal(canonical.defense_s, '4');
  assert.equal(canonical.defense_p, '5');
  assert.equal(canonical.defense_i, '6');
});
