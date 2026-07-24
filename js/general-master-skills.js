/* Fixed General-skill master rows are managed by sheet.js.
 * This bridge only preserves the readiness event used by layout helpers. */
(() => {
  let notified = false;

  function notifyReady() {
    if (notified) return;
    const root = document.querySelector("#general-skills");
    if (!root?.querySelector("tr[data-skill-key]")) {
      setTimeout(notifyReady, 80);
      return;
    }
    notified = true;
    window.dispatchEvent(new CustomEvent("tnx:general-master-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", notifyReady, { once: true });
  } else {
    notifyReady();
  }
})();
