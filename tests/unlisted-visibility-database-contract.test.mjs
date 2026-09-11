import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../supabase/migrations/20260912_preserve_unlisted_visibility.sql', import.meta.url),
  'utf8'
);

function readSqlStringAssignment(source, variableName) {
  const pattern = new RegExp(`${variableName}\\s+text\\s*:=\\s*'((?:''|[^'])*)';`);
  const match = source.match(pattern);
  assert.ok(match, `${variableName} SQL string assignment was not found`);
  return match[1].replaceAll("''", "'");
}

test('database save migration preserves public, unlisted, and private semantics', () => {
  const visibilityNormalizer = readSqlStringAssignment(migration, 'v_new');

  assert.equal(
    visibilityNormalizer,
    "case when p_character->>'visibility' in ('public', 'unlisted') then p_character->>'visibility' else 'private' end"
  );
  assert.match(migration, /v_definition := replace\(v_definition, v_old, v_new\);/);
  assert.match(migration, /Expected 2 legacy visibility normalizers/);
});
