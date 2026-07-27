/* Ensure finalized v4 columns override earlier visibility rules. */
(() => {
  const root = document.querySelector("#outfit-list");
  if (!root) return;
  let queued = false;

  function apply() {
    queued = false;
    root.querySelectorAll("table[data-outfit-schema]").forEach(table => {
      table.querySelectorAll("thead th,tbody td").forEach(cell => {
        if (cell.classList.contains("outfit-rule-v4-hidden")) return;
        cell.classList.remove("outfit-rule-hidden");
      });
    });
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  new MutationObserver(queue).observe(root, { childList: true, subtree: true });
  queue();
  setTimeout(queue, 140);
  setTimeout(queue, 540);
  setTimeout(queue, 1240);
})();