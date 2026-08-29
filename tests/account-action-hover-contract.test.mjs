import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css-next/pages/account-actions.css', import.meta.url), 'utf8');

test('owned cast action stylesheet exposes explicit hover and focus-visible feedback', () => {
  assert.match(css, /:is\(:hover, :focus-visible\)/);
  assert.match(css, /transform:\s*translateY\(-1px\)/);
  assert.match(css, /box-shadow:[\s\S]*var\(--color-accent\)/);
  assert.match(css, /button\[data-delete\]:is\(:hover, :focus-visible\)[\s\S]*var\(--color-danger\)/);
  assert.match(css, /:active[\s\S]*transform:\s*translateY\(0\)/);
});

test('hover text uses the theme text token instead of accent-derived foregrounds', () => {
  assert.match(css, /\.owned-cast :is\(\.owned-cast__links > a, \.owned-cast__management > a\):is\(:hover, :focus-visible\)[\s\S]*color:\s*var\(--color-text\)/);
  assert.match(css, /\.owned-cast__management > button:is\(:hover, :focus-visible\)[\s\S]*color:\s*var\(--color-text\)/);
  assert.doesNotMatch(css, /color:\s*color-mix\(in srgb, var\(--color-accent\) 88%, var\(--color-text\)\)/);
  assert.match(css, /button\[data-duplicate\]:is\(:hover, :focus-visible\)[\s\S]*var\(--color-accent\)/);
  assert.match(css, /button\[data-delete\]:is\(:hover, :focus-visible\)[\s\S]*var\(--color-danger\)/);
});
