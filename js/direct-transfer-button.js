(() => {
  const ACTIVE_MODE = "bookmarklet";
  const DIRECT_TRIGGER_SELECTOR = "[data-direct-transfer-trigger], #direct-transfer-button";
  const MOBILE_TRIGGER_SELECTOR = ".direct-transfer-button--mobile[data-direct-transfer-trigger]";

  function isMobileTrigger(node) {
    return node?.matches?.(MOBILE_TRIGGER_SELECTOR) === true;
  }

  function removeInactivePostTriggers(root = document) {
    if (root?.matches?.(DIRECT_TRIGGER_SELECTOR) && !isMobileTrigger(root)) root.remove();
    root?.querySelectorAll?.(DIRECT_TRIGGER_SELECTOR).forEach(node => {
      if (!isMobileTrigger(node)) node.remove();
    });
  }

  function resolvePublicId(trigger) {
    return trigger?.dataset?.transferId?.trim()
      || new URLSearchParams(location.search).get("id")?.trim()
      || "";
  }

  function syncMobileTrigger(trigger) {
    if (!(trigger instanceof HTMLButtonElement) || !isMobileTrigger(trigger)) return;
    const publicId = resolvePublicId(trigger);
    trigger.disabled = !publicId;
    trigger.title = publicId
      ? "スマートフォン用BM方式でキャラクターシート倉庫へ転記"
      : "保存済みキャストで利用できます。";
  }

  function syncMobileTriggers(root = document) {
    if (root?.matches?.(MOBILE_TRIGGER_SELECTOR)) syncMobileTrigger(root);
    root?.querySelectorAll?.(MOBILE_TRIGGER_SELECTOR).forEach(syncMobileTrigger);
  }

  function initializeBookmarkletMode() {
    document.documentElement.dataset.transferMode = ACTIVE_MODE;
    delete window.TNXDirectTransfer;
    removeInactivePostTriggers();
    syncMobileTriggers();

    document.addEventListener("click", event => {
      const target = event.target instanceof Element
        ? event.target.closest(MOBILE_TRIGGER_SELECTOR)
        : null;
      if (!(target instanceof HTMLButtonElement) || target.disabled) return;
      const publicId = resolvePublicId(target);
      if (!publicId) return;
      location.href = `./mobile-transfer.html?id=${encodeURIComponent(publicId)}`;
    });

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          removeInactivePostTriggers(node);
          syncMobileTriggers(node);
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
