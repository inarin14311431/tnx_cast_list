/* Hide the legacy startup-only blank General-skill rows without dispatching
 * delete/input events. The rows remain only in the editor's temporary state and
 * are excluded from save because they are blank and 0Lv. User-created blank
 * rows added after initialization are not included in the recorded key set. */
const generalInitialEmptySlotCleanupRootSelector = "#general-skills";
const generalInitialEmptySlotCleanupSlotSelector = "tr[data-general-slot-column][data-skill-key]";
const generalInitialEmptySlotCleanupStartupKeys = new Set();
let generalInitialEmptySlotCleanupInitialized = false;
let generalInitialEmptySlotCleanupObserver = null;
let generalInitialEmptySlotCleanupAttempts = 0;

function removeRecordedGeneralInitialEmptySlotRows(root) {
  for (const row of root.querySelectorAll(generalInitialEmptySlotCleanupSlotSelector)) {
    if (generalInitialEmptySlotCleanupStartupKeys.has(row.dataset.skillKey)) row.remove();
  }
}

function initializeGeneralInitialEmptySlotCleanup() {
  if (generalInitialEmptySlotCleanupInitialized) return;
  const root = document.querySelector(generalInitialEmptySlotCleanupRootSelector);
  if (!root) {
    if (generalInitialEmptySlotCleanupAttempts++ < 100) setTimeout(initializeGeneralInitialEmptySlotCleanup, 80);
    return;
  }

  const rows = [...root.querySelectorAll(generalInitialEmptySlotCleanupSlotSelector)];
  if (!rows.length) {
    if (!root.querySelector("tr[data-skill-key]") && generalInitialEmptySlotCleanupAttempts++ < 100) {
      setTimeout(initializeGeneralInitialEmptySlotCleanup, 80);
      return;
    }
    generalInitialEmptySlotCleanupInitialized = true;
    return;
  }

  rows.forEach(row => generalInitialEmptySlotCleanupStartupKeys.add(row.dataset.skillKey));
  removeRecordedGeneralInitialEmptySlotRows(root);
  generalInitialEmptySlotCleanupInitialized = true;

  generalInitialEmptySlotCleanupObserver = new MutationObserver(() => removeRecordedGeneralInitialEmptySlotRows(root));
  generalInitialEmptySlotCleanupObserver.observe(root, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeGeneralInitialEmptySlotCleanup, { once: true });
} else {
  initializeGeneralInitialEmptySlotCleanup();
}
