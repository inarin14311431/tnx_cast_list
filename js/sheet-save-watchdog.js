/* Ensure both manual and automatic saves are triggered reliably.
 * During a batch legacy import, save requests are held and executed once after
 * the final table conversion has completed. */
(() => {
  let timer = 0;
  let internal = false;
  let deferred = false;

  function saveButton() {
    return document.querySelector('#save-button');
  }

  function batchImportActive() {
    return Boolean(window.__tnxBatchImportActive);
  }

  function requiredFieldsReady() {
    return Boolean(
      document.querySelector('#character-name')?.value.trim() &&
      document.querySelector('#player-name')?.value.trim()
    );
  }

  function markDirtyForSheet() {
    const field = document.querySelector('#character-name');
    if (!field) return;
    internal = true;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    internal = false;
  }

  function executeSave() {
    if (batchImportActive()) {
      deferred = true;
      return false;
    }
    if (!requiredFieldsReady()) return false;
    const button = saveButton();
    if (!button || button.disabled) return false;
    deferred = false;
    button.click();
    return true;
  }

  function requestSave(delay = 1500) {
    clearTimeout(timer);
    if (batchImportActive()) {
      deferred = true;
      return;
    }
    timer = window.setTimeout(executeSave, delay);
  }

  document.addEventListener('input', event => {
    if (internal || !event.target.matches('input, select, textarea')) return;
    requestSave();
  }, true);

  document.addEventListener('change', event => {
    if (internal || !event.target.matches('input, select, textarea')) return;
    requestSave();
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest('#save-button');
    if (!button) return;
    if (batchImportActive()) {
      deferred = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    clearTimeout(timer);
    markDirtyForSheet();
  }, true);

  window.TNXSaveWatchdog = {
    flush() {
      clearTimeout(timer);
      markDirtyForSheet();
      return executeSave();
    },
    hasDeferred() {
      return deferred;
    }
  };

  window.addEventListener('beforeunload', () => clearTimeout(timer));
})();