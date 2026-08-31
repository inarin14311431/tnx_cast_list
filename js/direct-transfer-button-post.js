(() => {
  const TRIGGER_SELECTOR = "[data-direct-transfer-trigger], #direct-transfer-button";
  const MOBILE_TRIGGER_CLASS = "direct-transfer-button--mobile";
  let dialog = null;

  function resolvePublicId(trigger) {
    const triggerId = trigger?.dataset?.transferId?.trim() || "";
    if (triggerId) return triggerId;
    return new URLSearchParams(location.search).get("id")?.trim() || "";
  }

  function isMobileBookmarkletTrigger(trigger) {
    return trigger?.classList?.contains(MOBILE_TRIGGER_CLASS) === true;
  }

  function syncTrigger(trigger) {
    if (!(trigger instanceof HTMLButtonElement)) return;

    const publicId = resolvePublicId(trigger);
    trigger.disabled = !publicId;

    if (!publicId) {
      trigger.title = "保存済みキャストで利用できます。";
      return;
    }

    trigger.title = isMobileBookmarkletTrigger(trigger)
      ? "スマートフォン用BM方式でキャラクターシート倉庫へ転記"
      : "キャラクターシート倉庫へデータ転記";
  }

  function syncTriggers(root = document) {
    root.querySelectorAll?.(TRIGGER_SELECTOR).forEach(syncTrigger);
  }

  function closeDialogOnEscape(event) {
    if (event.key !== "Escape" || !dialog?.open) return;
    event.preventDefault();
    event.stopPropagation();
    dialog.close();
  }

  function ensureDialog() {
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "cast-transfer-dialog";
    dialog.setAttribute("aria-labelledby", "cast-transfer-dialog-title");
    dialog.innerHTML = `
      <div class="cast-transfer-dialog__shell">
        <header class="cast-transfer-dialog__header">
          <div>
            <span>CHARACTER SHEETS TRANSFER</span>
            <strong id="cast-transfer-dialog-title">データ転記</strong>
          </div>
          <button type="button" class="cast-transfer-dialog__close" aria-label="データ転記を閉じる">×</button>
        </header>
        <iframe class="cast-transfer-dialog__frame" title="データ転記"></iframe>
      </div>`;
    document.body.append(dialog);

    const frame = dialog.querySelector(".cast-transfer-dialog__frame");

    dialog.querySelector(".cast-transfer-dialog__close")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      dialog.close();
    });
    frame?.addEventListener("load", () => {
      try {
        frame.contentDocument?.addEventListener("keydown", closeDialogOnEscape, true);
      } catch {
        // Cross-origin iframe content cannot be inspected. Parent dialog Escape remains available.
      }
    });
    dialog.addEventListener("close", () => {
      if (frame) frame.src = "about:blank";
    });

    return dialog;
  }

  function openPostTransfer(publicId) {
    const modal = ensureDialog();
    const frame = modal.querySelector(".cast-transfer-dialog__frame");

    if (frame) {
      frame.src = `./transfer.html?embed=1&id=${encodeURIComponent(publicId)}`;
    }

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  }

  function openTransfer(trigger) {
    const publicId = resolvePublicId(trigger);
    if (!publicId) return;

    if (isMobileBookmarkletTrigger(trigger)) {
      location.href = `./mobile-transfer.html?id=${encodeURIComponent(publicId)}`;
      return;
    }

    openPostTransfer(publicId);
  }

  document.addEventListener("keydown", closeDialogOnEscape, true);
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest(TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLButtonElement) || trigger.disabled) return;
    openTransfer(trigger);
  });

  syncTriggers();

  window.TNXDirectTransfer = Object.freeze({
    sync(root = document) {
      syncTriggers(root);
    },
    open(trigger) {
      openTransfer(trigger);
    }
  });
})();
