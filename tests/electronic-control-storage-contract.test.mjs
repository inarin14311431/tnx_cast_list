import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOutfitForView } from '../js/outfit-view-model.js';
import { normalizeLoadedOutfit } from '../js/sheet-load-normalization.js';
import { buildOutfitSavePayloads } from '../js/sheet-save-payload.js';
import { masterRowToOutfitDetails } from '../js/outfit-ofc-adapter.js';
import { cloneOutfit, collectOutfitRecord } from '../js/sheet-mobile-outfit-model.js';

test('electronic control prefers ofc details for viewing', () => {
  const value = normalizeOutfitForView({ category: 'weapon', electronic_control: 'old', ofc_details: { electronic_control: 'new' } });
  assert.equal(value.electronic_control, 'new');
});

test('DB detail-only electronic control is visible in PC/public/mobile models', () => {
  const source = { id: 'row-detail-only', category: 'other', name: 'イナガキフォン', electronic_control: '', ofc_details: { electronic_control: '11' } };
  assert.equal(normalizeOutfitForView(source).electronic_control, '11');
  assert.equal(normalizeLoadedOutfit(source).electronic_control, '11');
  assert.equal(cloneOutfit(source).ofc_details.electronic_control, '11');
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

test('PC explicit clear removes canonical electronic control and does not mirror top-level', () => {
  const loaded = normalizeLoadedOutfit({
    id: 'row-clear',
    category: 'other',
    name: 'イナガキフォン',
    electronic_control: '',
    ofc_details: { electronic_control: '11', manufacturer: 'IANUS' }
  });
  loaded.electronic_control = '';
  const [record] = buildOutfitSavePayloads([loaded]);
  assert.equal(Object.hasOwn(record, 'electronic_control'), false);
  assert.equal(Object.hasOwn(record.ofc_details, 'electronic_control'), false);
  assert.equal(record.ofc_details.manufacturer, 'IANUS');
});

test('OFC master conversion places electronic control in canonical details', () => {
  const details = masterRowToOutfitDetails({
    site_category: 'other',
    name: 'イナガキフォン',
    electronic_control: '11',
    raw_data: {}
  });
  assert.equal(details.electronic_control, '11');
});

test('mobile editor keeps the value in ofc details', () => {
  const draft = cloneOutfit({ id: 'row-2', category: 'weapon', name: 'TEST', electronic_control: 'old', ofc_details: { electronic_control: 'new' } });
  assert.equal(draft.ofc_details.electronic_control, 'new');
  assert.equal(Object.hasOwn(draft, 'electronic_control'), false);
  const record = collectOutfitRecord(draft, { id: 'character-1' });
  assert.equal(record.ofc_details.electronic_control, 'new');
  assert.equal(Object.hasOwn(record, 'electronic_control'), false);
});

test('mobile explicit clear removes canonical electronic control', () => {
  const draft = cloneOutfit({ id: 'row-mobile-clear', category: 'other', name: 'イナガキフォン', ofc_details: { electronic_control: '11' } });
  draft.ofc_details.electronic_control = '';
  const record = collectOutfitRecord(draft, { id: 'character-1' });
  assert.equal(Object.hasOwn(record.ofc_details, 'electronic_control'), false);
  assert.equal(Object.hasOwn(record, 'electronic_control'), false);
});
