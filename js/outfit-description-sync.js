(() => {
  document.addEventListener("input", event => {
    const original = event.target instanceof Element
      ? event.target.closest('input[data-o="description"]')
      : null;
    if (!original) return;

    const proxy = original.closest("label")?.querySelector("textarea[data-description-proxy]");
    if (proxy && proxy.value !== original.value) proxy.value = original.value;
  }, true);
})();
