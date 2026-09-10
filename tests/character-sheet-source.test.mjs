import test from 'node:test';
import assert from 'node:assert/strict';
import { requestCharacterSheetSource } from '../js/character-sheet-source.js';
const url = 'https://character-sheets.appspot.com/tnx/edit.html?key=abc_123';
test('source transport sends only a validated key and returns wrapped data unchanged', async () => {
  const payload = { jsonData: '({"base":{"name":"取込対象"}})' };
  const result = await requestCharacterSheetSource(url, { invoke: async body => {
    assert.deepEqual(body, { key: 'abc_123' }); return { data: payload, error: null };
  }});
  assert.equal(result, payload);
});
test('invalid origins, protocols and oversized keys never invoke the backend', async () => {
  for (const value of ['https://example.com/tnx/edit.html?key=a', 'http://character-sheets.appspot.com/tnx/edit.html?key=a', url + 'a'.repeat(256)]) {
    await assert.rejects(requestCharacterSheetSource(value, { invoke: () => assert.fail('must not invoke') }));
  }
});
test('authentication, rate limit and upstream errors stop without a fallback or automatic retry', async () => {
  for (const status of [401,403,429,502,504]) {
    let calls = 0;
    await assert.rejects(requestCharacterSheetSource(url, { invoke: async () => {
      calls++; return { error: { context: { status } } };
    }}), error => error.status === status);
    assert.equal(calls, 1);
  }
});
test('invalid success payload is rejected', async () => {
  for (const data of [null, [], 'javascript']) await assert.rejects(requestCharacterSheetSource(url, { invoke: async () => ({data}) }));
});
