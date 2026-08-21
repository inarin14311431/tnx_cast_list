/* Keep the armor defense total footer and explanation column aligned with dynamically injected OFC columns. */
(() => {
  const root = document.querySelector("#outfit-list");
  if (!root) return;

  let queued = false;

  function fitArmorDescription(table, header) {
    const descriptionHead = header.querySelector(".outfit-table-head--description");
    if (!descriptionHead) return;

    const descriptionCells = [
      descriptionHead,
      ...table.querySelectorAll("tbody .outfit-table-cell--description")
    ];
    for (const cell of descriptionCells) {
      cell.style.width = "";
      cell.style.minWidth = "";
      cell.style.maxWidth = "";
    }

    const scroll = table.closest(".outfit-table-scroll");
    const targetWidth = scroll?.clientWidth || table.parentElement?.clientWidth || table.clientWidth;
    if (!targetWidth) return;

    // Measure every fixed column after OFC fields have been injected. The
    // explanation column receives the exact remainder, avoiding mixed %/px
    // table-layout calculations that can leave an anonymous gap at the right.
    const fixedWidth = [...header.children]
      .filter(cell => cell !== descriptionHead)
      .reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0);
    const descriptionWidth = Math.max(120, Math.floor(targetWidth - fixedWidth));

    for (const cell of descriptionCells) {
      cell.style.width = `${descriptionWidth}px`;
      cell.style.minWidth = `${descriptionWidth}px`;
      cell.style.maxWidth = `${descriptionWidth}px`;
    }
  }

  function alignArmorLayout() {
    const table = root.querySelector('table[data-outfit-schema="armor"]');
    const header = table?.querySelector("thead tr");
    const footer = table?.querySelector("tfoot .armor-defense-total-row");
    if (!table || !header || !footer) return;

    fitArmorDescription(table, header);

    const cells = [...header.children];
    const sIndex = cells.findIndex(cell => cell.dataset.ofcHead === "defense_s");
    const pIndex = cells.findIndex(cell => cell.dataset.ofcHead === "defense_p");
    const iIndex = cells.findIndex(cell => cell.dataset.ofcHead === "defense_i");
    if (sIndex < 0 || pIndex !== sIndex + 1 || iIndex !== pIndex + 1) return;

    const label = footer.querySelector("th");
    const tail = footer.querySelector("td:last-child");
    if (label) label.colSpan = Math.max(1, sIndex);
    if (tail) tail.colSpan = Math.max(1, cells.length - iIndex - 1);
  }

  function queue() {
    if (queued) return;
    queued = true;
    // outfit-tables renders first; outfit-ofc-fields injects S/P/I on the next frame.
    // Align one frame after that instead of observing every DOM mutation.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      queued = false;
      alignArmorLayout();
    }));
  }

  root.addEventListener("tnx:outfit-tables-rendered", queue);
  window.addEventListener("resize", queue, { passive: true });
  queue();
})();
