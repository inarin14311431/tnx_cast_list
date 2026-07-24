/* Fixed General-skill master rows are managed by sheet.js.
 * Remove the four temporary startup blank slots once, then preserve the
 * readiness event used by layout helpers. User-added blank rows are not
 * affected because cleanup finishes before the editor becomes interactive. */
(() => {
  let completed = false;

  function initializeGeneralRows() {
    if (completed) return;
    const root = document.querySelector("#general-skills");
    if (!root?.querySelector("tr[data-skill-key]")) {
      setTimeout(initializeGeneralRows, 80);
      return;
    }

    const temporarySlot = root.querySelector('tr[data-general-slot-column]');
    if (temporarySlot) {
      const deleteButton = temporarySlot.querySelector("[data-delete-skill]");
      if (deleteButton) {
        deleteButton.click();
        queueMicrotask(initializeGeneralRows);
        return;
      }
      temporarySlot.remove();
      queueMicrotask(initializeGeneralRows);
      return;
    }

    completed = true;
    window.dispatchEvent(new CustomEvent("tnx:general-master-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGeneralRows, { once: true });
  } else {
    initializeGeneralRows();
  }
})();
