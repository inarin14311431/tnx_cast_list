/* Manual-save guard for the sheet editor.
 * sheet.js historically schedules saveAll(false) 1.2 seconds after edits.
 * Suppress only that exact timer. All other timers continue normally.
 */
(() => {
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const suppressedTimers = new Set();
  let nextSuppressedId = -1;

  window.setTimeout = function manualSaveSetTimeout(handler, delay, ...args) {
    const source = typeof handler === 'function' ? Function.prototype.toString.call(handler) : '';
    const isLegacyAutoSave = Number(delay) === 1200 && /saveAll\s*\(\s*false\s*\)/.test(source);

    if (isLegacyAutoSave) {
      const id = nextSuppressedId--;
      suppressedTimers.add(id);
      return id;
    }

    return nativeSetTimeout(handler, delay, ...args);
  };

  window.clearTimeout = function manualSaveClearTimeout(id) {
    if (suppressedTimers.delete(id)) return;
    nativeClearTimeout(id);
  };

  function hasUnsavedChanges() {
    const status = document.querySelector('#save-status');
    const button = document.querySelector('#save-button');
    return Boolean(
      status?.classList.contains('unsaved') ||
      button?.dataset.saveState === 'unsaved' ||
      /未保存/.test(status?.textContent || '')
    );
  }

  window.addEventListener('beforeunload', event => {
    if (!hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  function applyManualSaveLabels() {
    const saveButton = document.querySelector('#save-button');
    if (saveButton) {
      saveButton.title = '編集内容は自動保存されません。クリックして保存してください。';
    }

    const importGuide = document.querySelector('#legacy-import-dialog p');
    if (importGuide) {
      importGuide.textContent = 'キャラシ倉庫で取得したJSONを貼り付けてください。反映後に内容を確認し、画面左の保存ボタンを押すまでDBには保存されません。';
    }

    const statuses = [
      document.querySelector('#personal-data-status'),
      document.querySelector('#life-path-status')
    ].filter(Boolean);
    for (const status of statuses) {
      if (!status.textContent || /保存|登録/.test(status.textContent)) {
        status.textContent = '保存ボタンで保存されます。';
        status.className = '';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyManualSaveLabels, { once: true });
  } else {
    applyManualSaveLabels();
  }
})();
