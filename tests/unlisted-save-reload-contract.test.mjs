import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const payload = fs.readFileSync(new URL('../js/sheet-save-payload.js', import.meta.url), 'utf8');
const desktopSnapshot = fs.readFileSync(new URL('../js/sheet-character-input-snapshot.js', import.meta.url), 'utf8');
const mobile = fs.readFileSync(new URL('../js/sheet-mobile.js', import.meta.url), 'utf8');

test('desktop editor carries unlisted from control to save payload', () => {
  assert.match(desktopSnapshot, /new Set\(\["public", "unlisted", "private"\]\)/);
  assert.match(payload, /\["public", "unlisted", "private"\]\.includes\(base\.visibility\)/);
});

test('mobile editor keeps the same three-state visibility contract', () => {
  assert.match(mobile, /new Set\(\["public", "unlisted", "private"\]\)/);
});
