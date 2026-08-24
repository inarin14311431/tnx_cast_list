import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public style-skill view preserves explicit line breaks in names', async () => {
  const source = await read('js/cast-style-skills.js');
  assert.match(source, /const multilineHtml = value =>/);
  assert.match(source, /replace\(\/\\n\/g, "<br>"\)/);
  assert.match(source, /if \(key === "name"\)/);
  assert.match(source, /<div class="style-field-scroll style-skill-name-view"/);
  assert.match(source, /createSeparatorRow\(skill\).*multilineHtml/s);

  const css = await read('css-next/pages/cast-view-details.css');
  assert.match(css, /\.style-skill-name-view/);
  assert.match(css, /white-space:pre-wrap/);
  assert.match(css, /overflow-wrap:anywhere/);
});
