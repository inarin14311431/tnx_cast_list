(() => {
  const ACTIVE_MODE = "bookmarklet";
  // Reserved for a possible future POST route. This path is not imported while BM mode is active.
  const DORMANT_POST_ADAPTER = "./direct-transfer-button-post.js?v=3";
  const DIRECT_TRIGGER_SELECTOR = "[data-direct-transfer-trigger], #direct-transfer-button";
  const MOBILE_TRIGGER_SELECTOR = ".direct-transfer-button--mobile[data-direct-transfer-trigger]";
  const DESKTOP_EXPORT_ORDER = [
    "udonarium-export-button",
    "cocofolia-copy-button",
    "transfer-tsv-copy-button",
    "transfer-bookmarklet-copy-button"
  ];

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

  function normalizeDesktopExportOrder() {
    const container = document.querySelector(".cast-header__export-actions");
    if (!container) return;

    const buttons = DESKTOP_EXPORT_ORDER
      .map(id => document.getElementById(id))
      .filter(button => button?.parentElement === container);
    if (buttons.length < 2) return;

    const children = [...container.children];
    const indexes = buttons.map(button => children.indexOf(button));
    const isOrdered = indexes.every((index, position) => position === 0 || indexes[position - 1] < index);
    if (isOrdered) return;

    for (const button of buttons) container.append(button);
  }

  function observationRoots() {
    const page = document.body?.dataset.page || "";
    if (page === "sheet.html") {
      return [
        document.querySelector(".sheet-layout"),
        document.querySelector(".exp-panel")
      ].filter(Boolean);
    }
    if (page === "cast.html") {
      return [
        document.querySelector(".cast-header"),
        document.querySelector("#mobile-cast-view"),
        document.querySelector("#cast-content"),
        document.querySelector("#quick-sheet")
      ].filter(Boolean);
    }
    return [];
  }

  function initializeBookmarkletMode() {
    document.documentElement.dataset.transferMode = ACTIVE_MODE;
    delete window.TNXDirectTransfer;
    removeInactivePostTriggers();
    syncMobileTriggers();
    normalizeDesktopExportOrder();

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
      normalizeDesktopExportOrder();
    });
    observationRoots().forEach(root => observer.observe(root, { childList: true, subtree: true }));

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
