import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacterSavePayload } from '../js/sheet-save-payload.js';

function payloadFor(visibility) {
  return buildCharacterSavePayload({
    base: {
      character_name: 'TEST CAST',
      player_name: 'TEST PLAYER',
      visibility
    }
  });
}

test('character save payload preserves all supported visibility states', () => {
  assert.equal(payloadFor('public').visibility, 'public');
  assert.equal(payloadFor('unlisted').visibility, 'unlisted');
  assert.equal(payloadFor('private').visibility, 'private');
});

test('character save payload falls back to private for an invalid visibility value', () => {
  assert.equal(payloadFor('unexpected').visibility, 'private');
  assert.equal(payloadFor(undefined).visibility, 'private');
});
