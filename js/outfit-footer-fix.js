/* Keep the armor total row aligned with the finalized visible column layout. */
(() => {
  const root = document.querySelector("#outfit-list");
  if (!root) return;

  let queued = false;

  function fixArmorFooter() {
    root.querySelectorAll('table[data-outfit-schema="armor"]').forEach(table => {
      const row = table.querySelector("tfoot .armor-defense-total-row");
      if (!row) return;

      const cells = [...row.children];
      const label = cells[0];
      const tail = cells[cells.length - 1];
      if (!label || !tail) return;

      /* Five columns precede S/I/P; six visible columns follow them. */
      label.colSpan = 5;
      tail.colSpan = 6;
      tail.classList.add("armor-defense-total-tail");
    });
  }

  function queueFix() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fixArmorFooter();
    });
  }

  new MutationObserver(queueFix).observe(root, { childList: true, subtree: true });
  queueFix();
  setTimeout(queueFix, 150);
  setTimeout(queueFix, 600);
})();