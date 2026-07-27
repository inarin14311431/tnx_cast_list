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

      const hasBaseControl = Boolean(table.querySelector('.outfit-table-head--control_modifier:not(.outfit-rule-hidden)'));
      if (hasBaseControl) {
        table.querySelectorAll('[data-ofc-head="control_value"],[data-ofc-cell="control_value"]')
          .forEach(cell => cell.classList.add("outfit-rule-hidden"));
      }

      if (category === "tron") {
        table.querySelectorAll('[data-ofc-head="slot"],[data-ofc-cell="slot"]')
          .forEach(cell => cell.classList.add("outfit-rule-hidden"));
      }
    });
  }

  function applyCastRules() {
    document.querySelectorAll(`${CAST_ROOT} .outfit-section`).forEach(section => {
      const category = categoryFromHeading(section.querySelector("h2")?.textContent || "");
      section.querySelectorAll(".cast-outfit-ofc-details > div").forEach(item => {
        const dt = item.querySelector("dt");
        if (!dt) return;
        const label = dt.textContent.trim();

        if (label === "制御値") dt.textContent = "制御";
        if (label === "スロット") dt.textContent = "ス";
        if (category === "tron" && label === "部位") {
          item.classList.add("cast-outfit-detail-hidden");
        }
      });
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