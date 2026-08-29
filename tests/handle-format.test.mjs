import test from 'node:test';
import assert from 'node:assert/strict';

const listeners = new Map();
globalThis.window = {};
globalThis.document = {
  readyState: 'loading',
  addEventListener(type, handler) {
    listeners.set(type, handler);
  }
};

await import(`../js/handle-format.js?test=${Date.now()}`);

const { quoteHandle, splitQuotedIdentity } = window.TNXHandleFormat;

test('quoteHandle canonicalizes supported outer quote styles', () => {
  assert.equal(quoteHandle('KAGACHI'), '“KAGACHI”');
  assert.equal(quoteHandle('"KAGACHI"'), '“KAGACHI”');
  assert.equal(quoteHandle('「KAGACHI」'), '“KAGACHI”');
  assert.equal(quoteHandle('『KAGACHI』'), '“KAGACHI”');
  assert.equal(quoteHandle('“「KAGACHI」”'), '“KAGACHI”');
});

test('quoteHandle trims input and keeps empty values empty', () => {
  assert.equal(quoteHandle('  KAGACHI  '), '“KAGACHI”');
  assert.equal(quoteHandle(''), '');
  assert.equal(quoteHandle('   '), '');
  assert.equal(quoteHandle(null), '');
});

test('splitQuotedIdentity separates handle and character name', () => {
  assert.deepEqual(splitQuotedIdentity('“KAGACHI” 十六夜'), {
    handle: 'KAGACHI',
    name: '十六夜'
  });
  assert.deepEqual(splitQuotedIdentity('「カガチ」 十六夜'), {
    handle: 'カガチ',
    name: '十六夜'
  });
});

test('splitQuotedIdentity preserves an unquoted identity as the character name', () => {
  assert.deepEqual(splitQuotedIdentity('十六夜'), {
    handle: '',
    name: '十六夜'
  });
  assert.deepEqual(splitQuotedIdentity('  十六夜  '), {
    handle: '',
    name: '十六夜'
  });
});
