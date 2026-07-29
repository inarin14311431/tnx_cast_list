/* Align outfit columns with the character-sheets.appspot.com TNX editor. */
(() => {
  const ROOT = "#outfit-list";
  const HIDDEN_FIELDS = {
    weapon: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    armor: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    cyberware: [
      "attack", "parry", "range_text", "speed", "defense_s", "defense_p", "defense_i", "slot",
      "major_category", "minor_category", "manufacturer", "concealment_penalty"
    ],
    tron: [
      "ianus_surface", "ianus_deep", "ianus_none", "cs_value",
      "major_category", "minor_category", "manufacturer", "page_number", "concealment_penalty",
      "tron_software", "tron_support", "tron_hardware"
    ],
    vehicle: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    residence: [
      "major_category", "minor_category", "manufacturer", "concealment_penalty",
      "residence_electric", "residence_area"
    ],
    other: [
      "mundane_modifier", "attack", "parry", "range_text", "speed",
      "defense_s", "defense_p", "defense_i", "sf", "slot",
      "major_category", "minor_category", "manufacturer", "page_number", "concealment_penalty",
      "control_value", "electronic_control", "cs_value"
    ]
  };

  const DESCRIPTION_FIELDS = {
    tron: {
      ianus_surface: "IANUS 表", ianus_deep: "IANUS 深", ianus_none: "IANUS 無",
      cs_value: "CS値", major_category: "OFC大分類", minor_category: "OFC小分類",
      manufacturer: "メーカー", page_number: "参照P", concealment_penalty: "隠匿ペナ",
      tron_software: "トロン ソ", tron_support: "トロン サ", tron_hardware: "トロン ハ"
    },
    cyberware: {
      attack: "攻", parry: "受", range_text: "射", speed: "スロット",
      defense_s: "防S", defense_p: "防P", defense_i: "防I", slot: "部位"
    }
  };

  let queued = false;
  let applying = false;

  function initialize() {
    const root = document.querySelector(ROOT);
    if (!root) return;
    new MutationObserver(queue).observe(root, { childList: true, subtree: true });
    document.addEventListener("input", handleConcealmentInput, true);
    document.addEventListener("change", handleConcealmentInput, true);
    queue();
  }

  function queue() {
    if (queued || applying) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      adjustAll();
    });
  }

  function adjustAll() {
    applying = true;
    try {
      document.querySelectorAll(`${ROOT} table[data-outfit-schema]`).forEach(adjustTable);
    } finally {
      applying = false;
    }
  }

  function adjustTable(table) {
    const category = table.dataset.outfitSchema || "other";
    renameHeaders(table, category);
    mergeConcealment(table);
    hideUnwantedColumns(table, category);
    table.querySelectorAll("tbody [data-outfit-key]").forEach(row => {
      appendHiddenDetails(row, category);
    });
    repairArmorFooter(table, category);
  }

  function renameHeaders(table, category) {
    const labels = {
      speed: "スロット",
      slot: "部位",
      residence_entry: "登場",
      mundane_modifier: "外界"
    };
    for (const [field, text] of Object.entries(labels)) {
      const header = table.querySelector(`[data-ofc-head="${field}"],.outfit-table-head--${field}`);
      if (header) header.textContent = text;
    }
    const baseSlot = table.querySelector(".outfit-table-head--slot");
    if (baseSlot) baseSlot.textContent = "部位";
    if (category === "residence") {
      const entry = table.querySelector('[data-ofc-head="residence_entry"]');
      if (entry) entry.textContent = "登場";
    }
  }

  function mergeConcealment(table) {
    table.querySelectorAll("tbody [data-outfit-key]").forEach(row => {
      const concealment = row.querySelector('[data-o="concealment"]');
      const penalty = row.querySelector('[data-ofc="concealment_penalty"]');
      if (!concealment || !penalty || !penalty.value.trim()) return;
      const current = concealment.value.trim();
      const parts = current.split(/[\/／]/);
      if (parts.length < 2 || !parts.slice(1).join("/").trim()) {
        concealment.value = `${parts[0] || ""}/${penalty.value.trim()}`;
        concealment.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  function handleConcealmentInput(event) {
    const concealment = event.target.closest?.('[data-o="concealment"]');
    if (!concealment) return;
    const row = concealment.closest("[data-outfit-key]");
    const penalty = row?.querySelector('[data-ofc="concealment_penalty"]');
    if (!penalty) return;
    const parts = concealment.value.split(/[\/／]/);
    penalty.value = parts.length > 1 ? parts.slice(1).join("/").trim() : "";
  }

  function hideUnwantedColumns(table, category) {
    const fields = new Set(HIDDEN_FIELDS[category] || []);
    if (category === "other" || category === "residence") fields.add("mundane_modifier");
    for (const field of fields) {
      table.querySelectorAll(
        `[data-ofc-head="${cssEscape(field)}"],[data-ofc-cell="${cssEscape(field)}"],` +
        `.outfit-table-head--${cssEscape(field)},.outfit-table-cell--${cssEscape(field)}`
      ).forEach(cell => {
        cell.hidden = true;
        cell.style.display = "none";
        cell.setAttribute("aria-hidden", "true");
      });
    }
  }

  function appendHiddenDetails(row, category) {
    const mapping = DESCRIPTION_FIELDS[category];
    if (!mapping) return;
    const description = row.querySelector('[data-o="description"]');
    if (!description) return;

    const current = String(description.value || "");
    const lines = [];
    for (const [field, label] of Object.entries(mapping)) {
      const input = row.querySelector(`[data-ofc="${cssEscape(field)}"]`);
      const value = String(input?.value || "").trim();
      if (!value) continue;
      const pattern = new RegExp(`(?:^|\\n)${escapeRegExp(label)}[：:]`);
      if (!pattern.test(current)) lines.push(`${label}：${value}`);
    }
    if (!lines.length) return;
    description.value = [current.trim(), ...lines].filter(Boolean).join("\n");
    description.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function repairArmorFooter(table, category) {
    if (category !== "armor") return;
    const headerCount = [...table.querySelectorAll("thead tr > th")].filter(cell => !cell.hidden).length;
    const totalHeading = table.querySelector("tfoot th");
    if (totalHeading) totalHeading.colSpan = Math.max(1, headerCount - 4);
  }

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/(["\\])/g, "\\$1");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
