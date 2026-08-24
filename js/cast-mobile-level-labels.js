(() => {
  const ROOT_SELECTOR = "#mobile-cast-view";
  const LEVEL_SELECTORS = [
    ".mobile-skill-row > b",
    ".mobile-style-row > b"
  ].join(",");

  function apply(root = document) {
    let updated = 0;
    root.querySelectorAll?.(LEVEL_SELECTORS).forEach(element => {
      if (element.dataset.mobileLevelLabel === "1") return;
      const value = String(element.textContent || "").trim();
      if (!value) return;
      element.textContent = `Lv${value.replace(/^Lv\s*/i, "")}`;
      element.dataset.mobileLevelLabel = "1";
      updated += 1;
    });
    return updated;
  }

  function initialize() {
    const root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    apply(root);
    const observer = new MutationObserver(() => apply(root));
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();

import("./cast-troops-link.js?v=2").catch(error => {
  console.error("cast troop navigation failed to load", error);
});
