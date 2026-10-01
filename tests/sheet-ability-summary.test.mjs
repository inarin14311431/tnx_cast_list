import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('both skill headings show final abilities and follow source mutations', () => {
  class Element {
    children = [];
    textContent = '';
    attributes = {};
    clientWidth = 1000;
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector() { return this.children.find(child => child.className === 'sheet-ability-summary'); }
    getBoundingClientRect() { return { width: 100 }; }
  }
  const grid = new Element();
  const headings = [new Element(), new Element()];
  const keys = ['reason', 'passion', 'life', 'mundane'];
  const sources = keys.map((key, index) => Object.assign(new Element(), { textContent: String([6, 4, 3, 5][index]) }));
  let observer;
  let resize;
  const source = readFileSync(new URL('../js/sheet-ability-summary.js', import.meta.url), 'utf8');
  runInNewContext(source, {
    document: {
      querySelector(selector) {
        if (selector === '#ability-grid') return grid;
        if (selector === '#sheet-skills > .section-toggle') return headings[0];
        if (selector === '#sheet-style-skills > .section-toggle') return headings[1];
        return sources[keys.findIndex(key => selector === `#${key}-final`)];
      },
      createElement: () => new Element()
    },
    MutationObserver: class {
      constructor(callback) { observer = callback; }
      observe(target, options) {
        assert.equal(target, grid);
        assert.equal(options.characterData, true);
        assert.equal(options.childList, true);
        assert.equal(options.subtree, true);
      }
    },
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} },
    getComputedStyle: () => ({ columnGap: '8', paddingLeft: '17', paddingRight: '48' })
  });
  const summaries = headings.map(heading => heading.children[0]);
  const values = summary => summary.children.slice(1).map(item => item.children[1].textContent);
  for (const summary of summaries) {
    assert.equal(summary.className, 'sheet-ability-summary');
    assert.deepEqual(values(summary), ['6', '4', '3', '5']);
    assert.equal(summary.hidden, false);
  }
  sources.forEach((element, index) => { element.textContent = String(10 + index); });
  observer();
  summaries.forEach(summary => assert.deepEqual(values(summary), ['10', '11', '12', '13']));
  headings[0].clientWidth = 80;
  resize();
  assert.equal(summaries[0].hidden, true);
  headings[0].clientWidth = 1000;
  resize();
  assert.equal(summaries[0].hidden, false);
});
