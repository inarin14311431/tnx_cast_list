(() => {
  const ACTIVE_MODE = "bookmarklet";
  const DIRECT_TRIGGER_SELECTOR = "[data-direct-transfer-trigger], #direct-transfer-button";

  function removeInactivePostTriggers(root = document) {
    if (root?.matches?.(DIRECT_TRIGGER_SELECTOR)) root.remove();
    root?.querySelectorAll?.(DIRECT_TRIGGER_SELECTOR).forEach(node => node.remove());
  }

  function initializeBookmarkletMode() {
    document.documentElement.dataset.transferMode = ACTIVE_MODE;
    delete window.TNXDirectTransfer;
    removeInactivePostTriggers();

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) removeInactivePostTriggers(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    import("./transfer-tsv-export.js?v=1").catch(error => {
      console.error("bookmarklet transfer adapter failed to load", error);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBookmarkletMode, { once: true });
  } else {
    initializeBookmarkletMode();
  }
})();
