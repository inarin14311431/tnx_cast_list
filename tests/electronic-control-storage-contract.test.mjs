import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOutfitForView } from '../js/outfit-view-model.js';
import { normalizeLoadedOutfit } from '../js/sheet-load-normalization.js';
import { cloneOutfit, collectOutfitRecord } from '../js/sheet-mobile-outfit-model.js';

test('electronic control prefers ofc details for viewing', () => {
  const value = normalizeOutfitForView({ category: 'weapon', electronic_control: 'old', ofc_details: { electronic_control: 'new' } });
  assert.equal(value.electronic_control, 'new');
});

test('electronic control can read an old top-level value when details are empty', () => {
  const value = normalizeOutfitForView({ category: 'weapon', electronic_control: 'old', ofc_details: {} });
  assert.equal(value.electronic_control, 'old');
});

test('PC editor loading prefers ofc details', () => {
  const value = normalizeLoadedOutfit({ id: 'row-1', category: 'weapon', electronic_control: 'old', ofc_details: { electronic_control: 'new' } });
  assert.equal(value.electronic_control, 'new');
  assert.equal(value._ofc_details.electronic_control, 'new');
});

test('mobile editor keeps the value in ofc details', () => {
  const draft = cloneOutfit({ id: 'row-2', category: 'weapon', name: 'TEST', electronic_control: 'old', ofc_details: { electronic_control: 'new' } });
  assert.equal(draft.ofc_details.electronic_control, 'new');
  assert.equal(Object.hasOwn(draft, 'electronic_control'), false);
  const record = collectOutfitRecord(draft, { id: 'character-1' });
  assert.equal(record.ofc_details.electronic_control, 'new');
  assert.equal(Object.hasOwn(record, 'electronic_control'), false);
});
