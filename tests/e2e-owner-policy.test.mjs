import test from 'node:test';
import assert from 'node:assert/strict';
import { TEST_OWNER_ID, TEST_OWNER_EMAIL, assertTestIdentity, assertOwnedTarget, permitsMutation } from './e2e/owner-policy.js';
test('test identity and target ownership fail closed', () => {
  assert.doesNotThrow(() => assertTestIdentity({id: TEST_OWNER_ID,email:TEST_OWNER_EMAIL}));
  for (const user of [null, {id:'another-owner',email:TEST_OWNER_EMAIL}, {id:TEST_OWNER_ID,email:'other@example.com'}]) assert.throws(() => assertTestIdentity(user));
  assert.throws(() => assertOwnedTarget({id:'cast',owner_id:'other'}));
});
test('write gate denies unknown owners, unscoped writes and unrelated RPCs', () => {
  const base = { authenticated:true, castIds:new Set(['owned']), search:new URLSearchParams(), method:'POST' };
  assert.equal(permitsMutation({...base,table:'rpc/save_character_bundle_with_ofc',body:{p_character_id:'owned'}}), true);
  for (const id of [null, 'other']) assert.equal(permitsMutation({...base,table:'rpc/save_character_bundle_with_ofc',body:{p_character_id:id}}), false);
  assert.equal(permitsMutation({...base,authenticated:false,table:'rpc/save_character_bundle_with_ofc',body:{p_character_id:'owned'}}), false);
  assert.equal(permitsMutation({...base,table:'rpc/delete_account',body:{}}), false);
  assert.equal(permitsMutation({...base,table:'character_combos',method:'DELETE',body:{}}), false);
  assert.equal(permitsMutation({...base,table:'character_combos',body:[{character_id:'owned'},{character_id:'other'}]}), false);
  assert.equal(permitsMutation({...base,table:'characters',method:'PATCH',search:new URLSearchParams('id=eq.owned'),body:{owner_id:'other'}}), false);
});
