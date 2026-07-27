/* Final outfit display rules based on the character-sheets.appspot.com TNX layout. */
(() => {
  const SHEET_ROOT = "#outfit-list";
  const CAST_ROOT = "#outfit-container";

  const HIDDEN_OFC_FIELDS = {
    weapon: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    armor: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    cyberware: [
      "attack", "parry", "range_text", "speed", "defense_s", "defense_p", "defense_i", "slot",
      "major_category", "minor_category", "manufacturer", "concealment_penalty"
    ],
    tron: [
      "major_category", "minor_category", "manufacturer", "page_number", "concealment_penalty",
      "ianus_surface", "ianus_deep", "ianus_none", "tron_software", "tron_support", "tron_hardware", "cs_value"
    ],
    vehicle: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    residence: [
      "major_category", "minor_category", "manufacturer", "concealment_penalty",
      "residence_electric", "residence_area"
    ],
    other: [
      "attack", "parry", "range_text", "speed", "defense_s", "defense_p", "defense_i", "sf", "slot",
      "major_category", "minor_category", "manufacturer", "page_number", "concealment_penalty",
      "control_value", "electronic_control", "cs_value"
    ]
  };

  const HIDDEN_BASE_FIELDS = {
    weapon: [],
    armor: [],
    cyberware: ["slot", "mundane_modifier"],
    tron: ["cs_modifier", "mundane_modifier"],
    vehicle: [],
    residence: ["mundane_modifier"],
    other: ["slot", "control_modifier", "cs_modifier", "mundane_modifier"]
  };

  const CAST_HIDDEN_DETAIL_LABELS = {
    weapon: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ"],
    armor: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ"],
    cyberware: [
      "攻", "受", "射", "ス", "スロット", "防御S", "防御P", "防御I", "部位",
      "OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ"
    ],
    tron: [
      "OFC大分類", "OFC小分類", "メーカー", "参照P", "隠匿ペナ",
      "IANUS 表", "IANUS 深", "IANUS 無", "トロン ソ", "トロン サ", "トロン ハ", "CS"
    ],
    vehicle: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ"],
    residence: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ", "住宅 電", "住宅 ア"],
    other: [
      "攻", "受", "射", "ス", "スロット", "防御S", "防御P", "防御I", "SF", "部位",
      "OFC大分類", "OFC小分類", "メーカー", "参照P", "隠匿ペナ", "制御値", "電制", "CS"
    ]
  };

  const TRON_DESCRIPTION_FIELDS = [
    ["major_category", "OFC大分類"],
    ["minor_category", "OFC小分類"],
    ["manufacturer", "メーカー"],
    ["page_number", "参照P"],
    ["concealment_penalty", "隠匿ペナ"],
    ["ianus_surface", "IANUS 表"],
    ["ianus_deep", "IANUS 深"],
    ["ianus_none", "IANUS 無"],
    ["cs_value", "CS値"],
    ["tron_software", "トロン ソ"],
    ["tron_support", "トロン サ"],
    ["tron_hardware", "トロン ハ"]
  ];

  const GENERATED_DESCRIPTION_LABELS = new Set([
    "OFC大分類", "大分類", "OFC小分類", "小分類", "メーカー", "受", "ス", "スロット",
    "制御値", "電制", "防御値", "参照P", "隠匿ペナ",
    "IANUS 表", "IANUS 深", "IANUS 無", "CS値",
    "トロン ソ", "トロン サ", "トロン ハ",
    "住宅 登", "住宅 電", "住宅 ア"
  ]);

  const CAST_BASE_HIDDEN_COLUMNS = {
    weapon: [6],
    armor: [4, 5],
    cyberware: [3, 4, 5, 6],
    tron: [4, 5, 6],
    vehicle: [],
    residence: [4, 5, 6],
    other: [3, 4, 5, 6]
  };

  let queued = false;
  let applying = false;

  initialize();

  function initialize() {
    const root = document.querySelector(SHEET_ROOT) || document.querySelector(CAST_ROOT);
    if (!root) return;

    new MutationObserver(queueApply).observe(root, { childList: true, subtree: true });
    document.addEventListener("input", event => {
      if (event.target.closest?.(`${SHEET_ROOT} [data-outfit-key]`)) queueApply();
    }, true);
    document.addEventListener("change", event => {
      if (event.target.closest?.(`${SHEET_ROOT} [data-outfit-key]`)) queueApply();
    }, true);

    queueApply();
    window.setTimeout(queueApply, 120);
    window.setTimeout(queueApply, 500);
  }

  function queueApply() {
    if (queued || applying) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applying = true;
      try {
        applySheetRules();
        applyCastRules();
      } finally {
        applying = false;
      }
    });
  }

  function applySheetRules() {
    document.querySelectorAll(`${SHEET_ROOT} table[data-outfit-schema]`).forEach(table => {
      const category = table.dataset.outfitSchema || "other";
      renameSheetHeaders(table);
      clearHiddenClasses(table);

      for (const field of HIDDEN_OFC_FIELDS[category] || []) {
        table.querySelectorAll(`[data-ofc-head="${cssEscape(field)}"],[data-ofc-cell="${cssEscape(field)}"]`)
          .forEach(element => element.classList.add("outfit-rule-hidden"));
      }
      for (const field of HIDDEN_BASE_FIELDS[category] || []) {
        table.querySelectorAll(`.outfit-table-head--${cssEscape(field)},.outfit-table-cell--${cssEscape(field)}`)
          .forEach(element => element.classList.add("outfit-rule-hidden"));
      }

      table.querySelectorAll("tbody [data-outfit-key]").forEach(row => {
        mergeConcealmentPenalty(row);
        rewriteDescription(row, category);
      });
    });
  }

  function renameSheetHeaders(table) {
    table.querySelectorAll('[data-ofc-head="speed"]').forEach(cell => {
      cell.textContent = "スロット";
      cell.title = "SLOT";
    });
    table.querySelectorAll('[data-ofc-head="residence_entry"]').forEach(cell => {
      cell.textContent = "登場";
      cell.title = "ENTRY";
    });
    table.querySelectorAll(".outfit-table-head--slot").forEach(cell => {
      cell.textContent = "部位";
      cell.title = "SLOT / PART";
    });
  }

  function clearHiddenClasses(table) {
    table.querySelectorAll(".outfit-rule-hidden").forEach(element => element.classList.remove("outfit-rule-hidden"));
  }

  function mergeConcealmentPenalty(row) {
    const concealment = row.querySelector('[data-o="concealment"]');
    const penalty = row.querySelector('[data-ofc="concealment_penalty"]');
    if (!concealment || !penalty) return;

    const parts = String(concealment.value || "").split(/[\/／]/);
    if (parts.length > 1) {
      const mergedPenalty = parts.slice(1).join("/").trim();
      if (penalty.value !== mergedPenalty) penalty.value = mergedPenalty;
      return;
    }

    const penaltyValue = String(penalty.value || "").trim();
    const concealmentValue = String(concealment.value || "").trim();
    if (!penaltyValue || !concealmentValue) return;

    concealment.value = `${concealmentValue}/${penaltyValue}`;
    concealment.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function rewriteDescription(row, category) {
    const description = row.querySelector('[data-o="description"]');
    if (!description || document.activeElement === description) return;

    const originalLines = String(description.value || "").replace(/\r/g, "").split("\n");
    const retained = originalLines.filter(line => {
      const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
      return !match || !GENERATED_DESCRIPTION_LABELS.has(match[1].trim());
    });

    if (category === "tron") {
      for (const [field, label] of TRON_DESCRIPTION_FIELDS) {
        const value = tronFieldValue(row, field);
        if (value) retained.push(`${label}：${value}`);
      }
    }

    const next = normalizeDescriptionLines(retained).join("\n");
    if (next === description.value) return;
    description.value = next;
    description.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function tronFieldValue(row, field) {
    if (field === "concealment_penalty") {
      const direct = row.querySelector(`[data-ofc="${field}"]`)?.value?.trim();
      if (direct) return direct;
      const parts = String(row.querySelector('[data-o="concealment"]')?.value || "").split(/[\/／]/);
      return parts.length > 1 ? parts.slice(1).join("/").trim() : "";
    }
    return String(row.querySelector(`[data-ofc="${field}"]`)?.value || "").trim();
  }

  function normalizeDescriptionLines(lines) {
    const output = [];
    for (const line of lines.map(value => String(value || "").trimEnd())) {
      if (!line.trim()) {
        if (output.length && output[output.length - 1] !== "") output.push("");
        continue;
      }
      output.push(line);
    }
    while (output[0] === "") output.shift();
    while (output[output.length - 1] === "") output.pop();
    return output;
  }

  function applyCastRules() {
    document.querySelectorAll(`${CAST_ROOT} .outfit-section`).forEach(section => {
      const category = categoryFromHeading(section.querySelector("h2")?.textContent || "");
      const table = section.querySelector("table");
      if (!table) return;

      const header = table.querySelector("thead tr");
      if (header?.cells?.[3]) header.cells[3].textContent = "部位";
      applyCastBaseColumns(table, category);

      table.querySelectorAll("tbody > tr:not(.cast-outfit-ofc-detail-row)").forEach(row => {
        const detailRow = row.nextElementSibling?.classList.contains("cast-outfit-ofc-detail-row")
          ? row.nextElementSibling
          : null;
        if (!detailRow) {
          cleanCastDescription(row, category, new Map());
          return;
        }

        const details = new Map();
        detailRow.querySelectorAll(".cast-outfit-ofc-details > div").forEach(item => {
          const dt = item.querySelector("dt");
          const dd = item.querySelector("dd");
          if (!dt || !dd) return;
          if (dt.textContent.trim() === "ス") dt.textContent = "スロット";
          if (dt.textContent.trim() === "住宅 登") dt.textContent = "登場";
          details.set(dt.textContent.trim(), dd.textContent.trim());
        });

        cleanCastDescription(row, category, details);
        const hidden = new Set(CAST_HIDDEN_DETAIL_LABELS[category] || []);
        detailRow.querySelectorAll(".cast-outfit-ofc-details > div").forEach(item => {
          const label = item.querySelector("dt")?.textContent?.trim() || "";
          if (hidden.has(label)) item.remove();
        });
        if (!detailRow.querySelector(".cast-outfit-ofc-details > div")) detailRow.remove();
      });
    });
  }

  function applyCastBaseColumns(table, category) {
    table.querySelectorAll(".cast-outfit-rule-hidden").forEach(cell => cell.classList.remove("cast-outfit-rule-hidden"));
    for (const index of CAST_BASE_HIDDEN_COLUMNS[category] || []) {
      table.querySelectorAll("tr").forEach(row => {
        if (row.cells?.[index]) row.cells[index].classList.add("cast-outfit-rule-hidden");
      });
    }
  }

  function cleanCastDescription(row, category, details) {
    const cell = row.cells?.[row.cells.length - 1];
    if (!cell) return;
    const retained = String(cell.textContent || "").replace(/\r/g, "").split("\n").filter(line => {
      const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
      return !match || !GENERATED_DESCRIPTION_LABELS.has(match[1].trim());
    });

    if (category === "tron") {
      const labels = [
        ["OFC大分類", "OFC大分類"], ["OFC小分類", "OFC小分類"], ["メーカー", "メーカー"],
        ["参照P", "参照P"], ["隠匿ペナ", "隠匿ペナ"],
        ["IANUS 表", "IANUS 表"], ["IANUS 深", "IANUS 深"], ["IANUS 無", "IANUS 無"],
        ["CS", "CS値"], ["トロン ソ", "トロン ソ"], ["トロン サ", "トロン サ"], ["トロン ハ", "トロン ハ"]
      ];
      for (const [sourceLabel, outputLabel] of labels) {
        const value = details.get(sourceLabel);
        if (value) retained.push(`${outputLabel}：${value}`);
      }
    }
    cell.textContent = normalizeDescriptionLines(retained).join("\n");
  }

  function categoryFromHeading(value) {
    const heading = String(value || "").toUpperCase();
    return ({
      WEAPON: "weapon", ARMOR: "armor", CYBERWARE: "cyberware", TRON: "tron",
      VEHICLE: "vehicle", RESIDENCE: "residence", OTHER: "other"
    })[heading] || "other";
  }

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/(["\\])/g, "\\$1");
  }
})();
