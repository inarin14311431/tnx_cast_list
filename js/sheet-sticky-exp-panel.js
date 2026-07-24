(() => {
  const root = document.documentElement;
  const header = document.querySelector(".sheet-header");
  const isNewCharacter = !new URLSearchParams(window.location.search).get("id");

  const resetToTop = () => {
    if (!isNewCharacter) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  if (isNewCharacter && "scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  resetToTop();
  requestAnimationFrame(() => requestAnimationFrame(resetToTop));
  window.addEventListener("load", resetToTop, { once: true });

  const saveStatus = document.querySelector("#save-status");
  if (isNewCharacter && saveStatus) {
    const observer = new MutationObserver(() => {
      const text = saveStatus.textContent || "";
      if (!/初期化中|読込中/.test(text)) {
        resetToTop();
        observer.disconnect();
      }
    });
    observer.observe(saveStatus, { childList: true, characterData: true, subtree: true });
  }

  if (!header) return;

  const updateOffset = () => {
    const height = Math.ceil(header.getBoundingClientRect().height || 0);
    root.style.setProperty("--sheet-editor-sticky-offset", `${Math.max(18, height + 16)}px`);
  };

  updateOffset();
  window.addEventListener("resize", updateOffset, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(updateOffset).observe(header);
})();
