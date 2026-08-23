(() => {
  const ACTIVE_MODE = "post";
  const POST_ADAPTER = "./direct-transfer-button-post.js?v=3";
  const TRIGGER_SELECTOR = "[data-direct-transfer-trigger], #direct-transfer-button";

  function removeInactiveBookmarkletActions(root = document) {
    root.querySelectorAll?.("#transfer-tsv-copy-button, #transfer-bookmarklet-copy-button").forEach(node => {
      const wrapper = node.parentElement;
      node.remove();
      if (wrapper && wrapper !== document.body && !wrapper.children.length && !wrapper.textContent.trim()) {
        wrapper.remove();
      }
    });
  }

  function ensureEditorTrigger() {
    if (document.body?.dataset.page !== "sheet.html") return null;

    const panel = document.querySelector(".exp-panel");
    if (!panel) return null;

    const existing = panel.querySelector(TRIGGER_SELECTOR);
    if (existing) return existing;

    const button = document.createElement("button");
    button.id = "direct-transfer-button";
    button.type = "button";
    button.className = "direct-transfer-button sheet-post-transfer-button";
    button.dataset.directTransferTrigger = "1";
    button.innerHTML = "<span>データ転記</span><small>CHARACTER SHEETS / POST</small>";

    const view = panel.querySelector("#cast-view-button");
    if (view?.parentElement === panel && view.nextSibling) {
      panel.insertBefore(button, view.nextSibling);
    } else {
      panel.append(button);
    }

    return button;
  }

  function syncPostUi(root = document) {
    removeInactiveBookmarkletActions(root);
    ensureEditorTrigger();
    window.TNXDirectTransfer?.sync?.(root);
  }

  async function initializePostMode() {
    document.documentElement.dataset.transferMode = ACTIVE_MODE;
    removeInactiveBookmarkletActions();
    ensureEditorTrigger();

    try {
      await import(POST_ADAPTER);
      syncPostUi();
    } catch (error) {
      console.error("POST transfer adapter failed to load", error);
      return;
    }

    const observer = new MutationObserver(mutations => {
      if (!mutations.some(mutation => mutation.addedNodes.length)) return;
      queueMicrotask(() => syncPostUi());
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePostMode, { once: true });
  } else {
    initializePostMode();
  }
})();
