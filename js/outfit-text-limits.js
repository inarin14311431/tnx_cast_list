/* Text-length limits for fixed-width outfit fields. */
(() => {
  const ROOT = "#outfit-list";
  const root = document.querySelector(ROOT);
  if (!root) return;

  const LIMITS = [
    ['[data-o="category"]', 7],
    ['[data-o="name"]', 12],
    ['[data-o="slot"]', 6],
    ['[data-o="attack"]', 6]
  ];

  function apply() {
    for (const [selector, maxLength] of LIMITS) {
      root.querySelectorAll(selector).forEach(field => {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
        field.maxLength = maxLength;
        if (field.dataset.outfitTextLimit === String(maxLength)) return;
        field.dataset.outfitTextLimit = String(maxLength);
        field.addEventListener("input", () => {
          const value = String(field.value || "");
          if ([...value].length <= maxLength) return;
          field.value = [...value].slice(0, maxLength).join("");
          field.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    }
  }

  let queued = false;
  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }

  new MutationObserver(queueApply).observe(root, { childList: true, subtree: true });
  queueApply();
  setTimeout(queueApply, 150);
  setTimeout(queueApply, 600);
})();