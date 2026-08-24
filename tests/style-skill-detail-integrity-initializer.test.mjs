import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/style-skill-detail-integrity.js', import.meta.url), 'utf8');

test('style skill detail integrity has an explicit idempotent initializer', () => {
  assert.match(source, /function initializeStyleSkillDetailIntegrity\(\)/);
  assert.match(source, /styleDetailIntegrityInitialized === "1"/);
  assert.match(source, /styleDetailIntegrityInitialized = "1"/);
});

test('style skill detail integrity keeps canonical event and repair hooks', () => {
  assert.match(source, /tnx:style-skills-changed/);
  assert.match(source, /root\.addEventListener\(STYLE_SKILLS_CHANGED_EVENT, queue\)/);
  assert.match(source, /requestAnimationFrame\(\(\) => \{ queued = false; scan\(\); \}\)/);
  assert.match(source, /original\.dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/);
});
