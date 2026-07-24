(() => {
  const root = document.documentElement;
  const header = document.querySelector(".sheet-header");
  if (!header) return;

  const updateOffset = () => {
    const height = Math.ceil(header.getBoundingClientRect().height || 0);
    root.style.setProperty("--sheet-editor-sticky-offset", `${Math.max(18, height + 16)}px`);
  };

  updateOffset();
  window.addEventListener("resize", updateOffset, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(updateOffset).observe(header);
})();
