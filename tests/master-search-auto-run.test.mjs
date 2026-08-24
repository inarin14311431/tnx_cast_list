import test from 'node:test';
import assert from 'node:assert/strict';

async function loadModuleWithDocument(documentStub) {
  globalThis.document = documentStub;
  const url = new URL('../js/sheet-master-search-auto-run.js', import.meta.url);
  url.searchParams.set('test', `${Date.now()}-${Math.random()}`);
  await import(url.href);
}

test('classification change reuses the existing search button', async () => {
  let changeHandler = null;
  let clicks = 0;
  const runButton = { disabled: false, click: () => { clicks += 1; } };
  const dialog = { open: true, querySelector: selector => selector === '#master-search-run' ? runButton : null };
  const filter = { closest: selector => selector === '#master-search-dialog' ? dialog : null };

  await loadModuleWithDocument({
    addEventListener(type, handler) {
      if (type === 'change') changeHandler = handler;
    }
  });

  assert.equal(typeof changeHandler, 'function');
  changeHandler({
    target: {
      closest(selector) {
        return selector.includes('#master-search-filter-primary') ? filter : null;
      }
    }
  });
  assert.equal(clicks, 1);
});

test('classification change does not search while search button is disabled', async () => {
  let changeHandler = null;
  let clicks = 0;
  const runButton = { disabled: true, click: () => { clicks += 1; } };
  const dialog = { open: true, querySelector: () => runButton };
  const filter = { closest: () => dialog };

  await loadModuleWithDocument({
    addEventListener(type, handler) {
      if (type === 'change') changeHandler = handler;
    }
  });

  changeHandler({ target: { closest: () => filter } });
  assert.equal(clicks, 0);
});
