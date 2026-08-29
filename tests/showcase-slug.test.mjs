import test from 'node:test';
import assert from 'node:assert/strict';
import { nextActSlugFromRows } from '../js/showcase-slug.js';

test('showcase slug starts at act-0001 when no prior acts exist', () => {
  assert.equal(nextActSlugFromRows([]), 'act-0001');
  assert.equal(nextActSlugFromRows(null), 'act-0001');
});

test('showcase slug advances from the highest numeric act slug', () => {
  assert.equal(nextActSlugFromRows([
    { slug: 'act-0002' },
    { slug: 'act-0009' },
    { slug: 'act-0004' }
  ]), 'act-0010');
});

test('showcase slug ignores unrelated and malformed slugs', () => {
  assert.equal(nextActSlugFromRows([
    { slug: 'draft-9999' },
    { slug: 'act-x' },
    { slug: 'act-12-extra' },
    { slug: 'act-0012' },
    {},
    null
  ]), 'act-0013');
});

test('showcase slug continues beyond four digits without truncation', () => {
  assert.equal(nextActSlugFromRows([{ slug: 'act-9999' }]), 'act-10000');
});
