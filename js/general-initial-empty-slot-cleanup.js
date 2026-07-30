/* Hide the legacy startup-only blank General-skill rows without dispatching
 * delete/input events. The rows remain only in the editor's temporary state and
 * are excluded from save because they are blank and 0Lv. User-created blank
 * rows added after initialization are not included in the recorded key set. */
(() => {
  const rootSelector = "#general-skills";
  const slotSelector = "tr[data-general-slot-column][data-skill-key]";
  const startupKeys = new Set();
  let initialized = false;
  let observer = null;
  let attempts = 0;

  function removeRecordedRows(root) {
    for (const row of root.querySelectorAll(slotSelector)) {
      if (startupKeys.has(row.dataset.skillKey)) row.remove();
    }
  }

  function initialize() {
    if (initialized) return;
    const root = document.querySelector(rootSelector);
    if (!root) {
      if (attempts++ < 100) setTimeout(initialize, 80);
      return;
    }

    const rows = [...root.querySelectorAll(slotSelector)];
    if (!rows.length) {
      if (!root.querySelector("tr[data-skill-key]") && attempts++ < 100) {
        setTimeout(initialize, 80);
        return;
      }
      initialized = true;
      return;
    }

    rows.forEach(row => startupKeys.add(row.dataset.skillKey));
    removeRecordedRows(root);
    initialized = true;

    observer = new MutationObserver(() => removeRecordedRows(root));
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
