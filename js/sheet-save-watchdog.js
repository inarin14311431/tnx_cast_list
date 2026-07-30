/* Ensure both manual and automatic saves are triggered reliably.
 * This layer does not replace the transactional save implementation in sheet.js;
 * it only makes sure sheet.js sees a dirty edit before save and retries the normal
 * save button after user changes have settled. */
(() => {
  let timer = 0;
  let internal = false;

  function saveButton() {
    return document.querySelector('#save-button');
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

  function requestSave(delay = 1500) {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!requiredFieldsReady()) return;
      const button = saveButton();
      if (!button || button.disabled) return;
      button.click();
    }, delay);
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
    clearTimeout(timer);
    markDirtyForSheet();
  }, true);

  window.addEventListener('beforeunload', () => clearTimeout(timer));
})();
