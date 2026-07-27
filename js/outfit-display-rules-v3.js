/* Additional compact outfit rules layered after v2. */
(() => {
  const SHEET_ROOT = "#outfit-list";
  const CAST_ROOT = "#outfit-container";
  let queued = false;

  initialize();

  function initialize() {
    const root = document.querySelector(SHEET_ROOT) || document.querySelector(CAST_ROOT);
    if (!root) return;
    new MutationObserver(queueApply).observe(root, { childList: true, subtree: true });
    queueApply();
    window.setTimeout(queueApply, 120);
    window.setTimeout(queueApply, 500);
    window.setTimeout(queueApply, 1200);
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applySheetRules();
      applyCastRules();
    });
  }

  function applySheetRules() {
    document.querySelectorAll(`${SHEET_ROOT} table[data-outfit-schema]`).forEach(table => {
      const category = table.dataset.outfitSchema || "other";

      table.querySelectorAll('[data-ofc-head="speed"]').forEach(cell => {
        cell.textContent = "ス";
        cell.title = "SLOT";
      });
      table.querySelectorAll('[data-ofc-head="control_value"]').forEach(cell => {
        cell.textContent = "制御";
        cell.title = "CONTROL";
      });
      table.querySelectorAll('.outfit-table-head--control_modifier').forEach(cell => {
        cell.textContent = "制御";
        cell.title = "CONTROL";
      });

      hideRightmostDuplicateControl(table);

      if (category === "tron") {
        table.querySelectorAll('[data-ofc-head="slot"],[data-ofc-cell="slot"]')
          .forEach(cell => cell.classList.add("outfit-rule-hidden"));
      }
    });
  }

  function hideRightmostDuplicateControl(table) {
    const headers = [...table.querySelectorAll("thead tr > th")]
      .filter(cell => cell.textContent.trim() === "制御")
      .filter(cell => !cell.classList.contains("outfit-rule-hidden"));
    if (headers.length < 2) return;

    const rightmost = headers[headers.length - 1];
    const index = [...rightmost.parentElement.children].indexOf(rightmost);
    rightmost.classList.add("outfit-rule-hidden");

    table.querySelectorAll("tbody tr").forEach(row => {
      if (row.children[index]) row.children[index].classList.add("outfit-rule-hidden");
    });
  }

  function applyCastRules() {
    document.querySelectorAll(`${CAST_ROOT} .outfit-section`).forEach(section => {
      const category = categoryFromHeading(section.querySelector("h2")?.textContent || "");
      const controlItems = [];

      section.querySelectorAll(".cast-outfit-ofc-details > div").forEach(item => {
        const dt = item.querySelector("dt");
        if (!dt) return;
        const label = dt.textContent.trim();

        if (label === "制御値") dt.textContent = "制御";
        if (label === "スロット") dt.textContent = "ス";
        if (dt.textContent.trim() === "制御") controlItems.push(item);
        if (category === "tron" && label === "部位") {
          item.classList.add("cast-outfit-detail-hidden");
        }
      });

      if (controlItems.length > 1) {
        controlItems[controlItems.length - 1].classList.add("cast-outfit-detail-hidden");
      }
    });
  }

  function categoryFromHeading(value) {
    const heading = String(value || "").toUpperCase();
    return ({
      WEAPON: "weapon", ARMOR: "armor", CYBERWARE: "cyberware", TRON: "tron",
      VEHICLE: "vehicle", RESIDENCE: "residence", OTHER: "other"
    })[heading] || "other";
  }
})();