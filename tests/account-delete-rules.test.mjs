import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getAccountDeletionFunctionError,
  validateAccountDeletionInput
} from '../js/account-delete-rules.js';

test('account deletion requires the exact DELETE confirmation phrase', () => {
  assert.equal(
    validateAccountDeletionInput({ phrase: 'delete', password: 'secret' }),
    '確認欄に DELETE と入力してください。'
  );
  assert.equal(
    validateAccountDeletionInput({ phrase: ' DELETE ', password: 'secret' }),
    ''
  );
});

test('account deletion requires a current password after confirmation', () => {
  assert.equal(
    validateAccountDeletionInput({ phrase: 'DELETE', password: '' }),
    '現在のパスワードを入力してください。'
  );
  assert.equal(
    validateAccountDeletionInput({ phrase: 'DELETE', password: 'secret' }),
    ''
  );
});

test('account deletion surfaces an edge-function error body when available', async () => {
  const error = {
    message: 'generic transport error',
    context: {
      json: async () => ({ error: '削除対象を確認できません。' })
    }
  };
  assert.equal(
    await getAccountDeletionFunctionError(error),
    '削除対象を確認できません。'
  );
});

test('account deletion falls back safely when the function error body is unavailable', async () => {
  assert.equal(
    await getAccountDeletionFunctionError({ message: 'network failed' }),
    'network failed'
  );
  assert.equal(
    await getAccountDeletionFunctionError({ context: { json: async () => { throw new Error('bad json'); } } }),
    'アカウント削除に失敗しました。'
  );
});

test('account deletion UI delegates validation and function error parsing to the tested rules', async () => {
  const source = await readFile(new URL('../js/account-delete.js', import.meta.url), 'utf8');
  assert.match(source, /validateAccountDeletionInput/);
  assert.match(source, /getAccountDeletionFunctionError/);
  assert.match(source, /functions\.invoke\("delete-account"/);
  assert.match(source, /confirmation: "DELETE"/);
});
