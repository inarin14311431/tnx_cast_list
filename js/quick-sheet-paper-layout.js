/* Paper-play adjustments for the quick sheet.
 * Keeps the page-compaction script in charge of moving the complete
 * other-outfits section between pages. */
(function () {
  const pages = document.querySelector("#quick-sheet-pages");
  if (!pages) return;

  let scheduled = 0;
  let normalizing = false;

  function paperCounter(limit) {
    const count = Math.max(0, Number(limit) || 0);
    if (!count) return "";
    return `<span class="quick-sheet__paper-counter" aria-label="使用回数 ${count} 回">${Array.from({ length: count }, () => "<i aria-hidden=\"true\"></i>").join("")}</span>`;
  }

  function convertCounters(root) {
    root.querySelectorAll(".quick-sheet__combo-card.is-counter").forEach(card => {
      const status = card.querySelector("header > b");
      if (!status || status.classList.contains("is-paper-counter")) return;
      const match = status.textContent.trim().match(/(?:\d+\s*\/\s*)?(\d+)/);
      if (!match) return;
      status.innerHTML = paperCounter(match[1]);
      status.classList.add("is-paper-counter");
    });
  }

  function putBeforeFooter(page, element, footer) {
    if (!page || !element || !footer) return;
    if (element.parentElement === page && element.nextElementSibling === footer) return;
    page.insertBefore(element, footer);
  }

  function reorderPageTwo(root) {
    const pageTwo = root.querySelector(".quick-sheet__page--two");
    if (!pageTwo) return;
    const footer = pageTwo.querySelector(".quick-sheet__page-footer");
    if (!footer) return;

    const styleSkills = root.querySelector('[data-quick-sheet-section="style-skills"]');
    const weapons = root.querySelector('[data-quick-sheet-section="weapons"]');
    const armor = root.querySelector('[data-quick-sheet-section="armor"]');
    const otherOutfits = root.querySelector('[data-quick-sheet-section="other-outfits"]');
    const combos = root.querySelector(".quick-sheet__combos");

    putBeforeFooter(pageTwo, styleSkills, footer);
    putBeforeFooter(pageTwo, weapons, footer);
    putBeforeFooter(pageTwo, armor, footer);

    // The complete wrapper stays intact so the page compactor can move it
    // between page 2 and page 3 without losing outfit order.
    if (otherOutfits?.parentElement === pageTwo) putBeforeFooter(pageTwo, otherOutfits, footer);

    // Combos / paper counters are the final section whenever they are on page 2.
    if (combos?.parentElement === pageTwo) putBeforeFooter(pageTwo, combos, footer);
  }

  function normalize() {
    if (normalizing) return;
    normalizing = true;
    try {
      convertCounters(pages);
      reorderPageTwo(pages);
    } finally {
      normalizing = false;
    }
  }

  function scheduleNormalize() {
    if (scheduled) cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      normalize();
    });
  }

  document.querySelector("#cast-quick-sheet-button")?.addEventListener("click", scheduleNormalize);
  document.querySelector("#quick-sheet-detail-toggle")?.addEventListener("click", scheduleNormalize);
  window.addEventListener("resize", scheduleNormalize);
})();
