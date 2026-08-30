(function(){
  const grid = document.querySelector("#cast-grid");
  const formatter = window.TNXArchiveId?.format;
  if (!grid || typeof formatter !== "function") return;

  const apply = root => {
    const cards = root.matches?.(".cast-card") ? [root] : [...root.querySelectorAll?.(".cast-card") ?? []];
    for (const card of cards) {
      const serial = card.querySelector(".cast-card__serial");
      const link = card.querySelector("a[data-archive-cast-link]");
      if (!serial || !link) continue;
      let rawId = "";
      try { rawId = new URL(link.href, location.href).searchParams.get("id")?.trim() || ""; } catch {}
      if (!rawId) continue;
      serial.textContent = formatter(rawId);
    }
  };

  apply(grid);
  new MutationObserver(mutations => {
    for (const mutation of mutations) mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) apply(node);
    });
  }).observe(grid, { childList: true, subtree: true });
})();
