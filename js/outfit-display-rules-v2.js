/* Final category-specific outfit rules, aligned with the TNX character sheet. */
(() => {
  const SHEET_ROOT = "#outfit-list";
  const CAST_ROOT = "#outfit-container";

  const HIDDEN_OFC_FIELDS = {
    weapon: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    armor: ["major_category", "minor_category", "manufacturer", "concealment_penalty"],
    cyberware: [
      "attack", "parry", "range_text", "speed", "defense_s", "defense_p", "defense_i", "slot",
      "major_category", "minor_category", "manufacturer", "concealment_penalty",
      "ianus_surface", "ianus_deep", "ianus_none"
    ],
    tron: [
      "major_category", "minor_category", "manufacturer", "concealment_penalty",
      "ianus_surface", "ianus_deep", "ianus_none",
      "tron_software", "tron_support", "tron_hardware", "cs_value"
    ],
    vehicle: [
      "major_category", "minor_category", "manufacturer", "concealment_penalty",
      "parry", "cs_value"
    ],
    residence: [
      "major_category", "minor_category", "manufacturer", "concealment_penalty",
      "residence_electric", "residence_area"
    ],
    other: [
      "attack", "parry", "range_text", "speed", "defense_s", "defense_p", "defense_i", "sf", "slot",
      "major_category", "minor_category", "manufacturer", "concealment_penalty",
      "control_value", "electronic_control", "cs_value"
    ]
  };

  const HIDDEN_BASE_FIELDS = {
    weapon: [],
    armor: [],
    cyberware: ["slot", "mundane_modifier"],
    tron: ["cs_modifier", "mundane_modifier"],
    vehicle: ["defense", "cs_modifier"],
    residence: ["mundane_modifier"],
    other: ["slot", "control_modifier", "cs_modifier", "mundane_modifier"]
  };

  const CAST_HIDDEN_DETAIL_LABELS = {
    weapon: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ"],
    armor: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ"],
    cyberware: [
      "攻", "受", "射", "ス", "スロット", "防御S", "防御P", "防御I", "部位",
      "OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ",
      "IANUS 表", "IANUS 深", "IANUS 無"
    ],
    tron: [
      "OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ",
      "IANUS 表", "IANUS 深", "IANUS 無", "トロン ソ", "トロン サ", "トロン ハ", "CS"
    ],
    vehicle: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ", "受", "CS"],
    residence: ["OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ", "住宅 電", "住宅 ア"],
    other: [
      "攻", "受", "射", "ス", "スロット", "防御S", "防御P", "防御I", "SF", "部位",
      "OFC大分類", "OFC小分類", "メーカー", "隠匿ペナ", "制御値", "電制", "CS"
    ]
  };

  const CAST_BASE_HIDDEN_COLUMNS = {
    weapon: [6],
    armor: [4, 5],
    cyberware: [3, 4, 5, 6],
    tron: [4, 5, 6],
    vehicle: [6],
    residence: [4, 5, 6],
    other: [3, 4, 5, 6]
  };

  const TRON_DESCRIPTION_FIELDS = [
    ["major_category", "OFC大分類"],
    ["minor_category", "OFC小分類"],
    ["manufacturer", "メーカー"],
    ["ianus_surface", "IANUS 表"],
    ["ianus_deep", "IANUS 深"],
    ["ianus_none", "IANUS 無"],
    ["cs_value", "CS値"],
    ["tron_software", "トロン ソ"],
    ["tron_support", "トロン サ"],
    ["tron_hardware", "トロン ハ"]
  ];

  const CYBER_IANUS_FIELDS = [
    ["ianus_surface", "表"],
    ["ianus_deep", "深"],
    ["ianus_none", "無"]
  ];

  const GENERATED_DESCRIPTION_LABELS = new Set([
    "OFC大分類", "大分類", "OFC小分類", "小分類", "メーカー", "受", "ス", "スロット",
    "制御値", "電制", "防御値", "参照P", "隠匿ペナ",
    "IANUS 表", "IANUS 深", "IANUS 無", "表", "深", "無", "CS値",
    "トロン ソ", "トロン サ", "トロン ハ",
    "住宅 登", "住宅 電", "住宅 ア"
  ]);

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
    window.setTimeout(queueApply, 1200);
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
      clearHiddenClasses(table);
      renameSheetHeaders(table, category);

      for (const field of HIDDEN_OFC_FIELDS[category] || []) {
        table.querySelectorAll(`[data-ofc-head="${cssEscape(field)}"],[data-ofc-cell="${cssEscape(field)}"]`)
          .forEach(element => element.classList.add("outfit-rule-hidden"));
      }
      for (const field of HIDDEN_BASE_FIELDS[category] || []) {
        table.querySelectorAll(`.outfit-table-head--${cssEscape(field)},.outfit-table-cell--${cssEscape(field)}`)
          .forEach(element => element.classList.add("outfit-rule-hidden"));
      }

      movePageColumnRight(table);

      table.querySelectorAll("tbody [data-outfit-key]").forEach(row => {
        mergeConcealmentPenalty(row);
        rewriteDescription(row, category);
      });

      if (category === "armor") repairArmorFooter(table);
    });
  }

  function clearHiddenClasses(table) {
    table.querySelectorAll(".outfit-rule-hidden").forEach(element => element.classList.remove("outfit-rule-hidden"));
  }

  function renameSheetHeaders(table, category) {
    table.querySelectorAll('[data-ofc-head="speed"]').forEach(cell => {
      cell.textContent = category === "vehicle" ? "ス" : "スロット";
      cell.title = category === "vehicle" ? "SPEED" : "SLOT";
    });
    table.querySelectorAll('[data-ofc-head="residence_entry"]').forEach(cell => {
      cell.textContent = "登場";
      cell.title = "ENTRY";
    });
    table.querySelectorAll(".outfit-table-head--slot").forEach(cell => {
      cell.textContent = "部位";
      cell.title = "PART";
    });
    if (category === "vehicle") {
      const labels = { defense_s: "S", defense_p: "P", defense_i: "I" };
      for (const [field, label] of Object.entries(labels)) {
        table.querySelectorAll(`[data-ofc-head="${field}"]`).forEach(cell => {
          cell.textContent = label;
          cell.title = `DEFENSE ${label}`;
        });
      }
    }
  }

  function movePageColumnRight(table) {
    const header = table.querySelector('[data-ofc-head="page_number"]');
    const actionHeader = table.querySelector(".outfit-table-head--actions");
    if (header && actionHeader && header.nextElementSibling !== actionHeader) actionHeader.before(header);

    table.querySelectorAll("tbody [data-outfit-key]").forEach(row => {
      const pageCell = row.querySelector('[data-ofc-cell="page_number"]');
      const actionCell = row.querySelector(".outfit-table-cell--actions");
      if (pageCell && actionCell && pageCell.nextElementSibling !== actionCell) actionCell.before(pageCell);
    });
  }

  function mergeConcealmentPenalty(row) {
    const concealment = row.querySelector('[data-o="concealment"]');
    const penalty = row.querySelector('[data-ofc="concealment_penalty"]');
    if (!concealment || !penalty) return;

    const parts = String(concealment.value || "").split(/[\/／]/);
    if (parts.length > 1) {
      penalty.value = parts.slice(1).join("/").trim();
      return;
    }

    const concealmentValue = String(concealment.value || "").trim();
    const penaltyValue = String(penalty.value || "").trim();
    if (!concealmentValue || !penaltyValue) return;

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

    if (category === "cyberware") {
      const ianus = CYBER_IANUS_FIELDS
        .map(([field, label]) => {
          const value = outfitFieldValue(row, field);
          return value ? `${label}：${value}` : "";
        })
        .filter(Boolean);
      if (ianus.length) retained.push(ianus.join("、"));
    }

    if (category === "tron") {
      for (const [field, label] of TRON_DESCRIPTION_FIELDS) {
        const value = outfitFieldValue(row, field);
        if (value) retained.push(`${label}：${value}`);
      }
    }

    const next = normalizeDescriptionLines(retained).join("\n");
    if (next === description.value) return;
    description.value = next;
    description.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function outfitFieldValue(row, field) {
    return String(row.querySelector(`[data-ofc="${cssEscape(field)}"]`)?.value || "").trim();
  }

  function repairArmorFooter(table) {
    const row = table.querySelector(".armor-defense-total-row");
    const label = row?.querySelector("th");
    const tail = row?.querySelector("td:last-child:not([data-armor-total])");
    if (!row || !label || !tail) return;

    const visibleHeaders = [...table.querySelectorAll("thead tr > th")]
      .filter(cell => !cell.classList.contains("outfit-rule-hidden") && getComputedStyle(cell).display !== "none");
    const defenseIndexes = ["defense_s", "defense_i", "defense_p"]
      .map(field => visibleHeaders.findIndex(cell => cell.classList.contains(`outfit-table-head--${field}`)))
      .filter(index => index >= 0);
    if (defenseIndexes.length !== 3) return;

    const first = Math.min(...defenseIndexes);
    const last = Math.max(...defenseIndexes);
    label.colSpan = Math.max(1, first);

    const tailCount = visibleHeaders.length - last - 1;
    tail.hidden = tailCount <= 0;
    if (tailCount > 0) tail.colSpan = tailCount;

    const totals = { s: 0, i: 0, p: 0 };
    table.querySelectorAll("tbody [data-armor-defense]").forEach(input => {
      const key = String(input.dataset.armorDefense || "").toLowerCase();
      if (key in totals) totals[key] += numericValue(input.value);
    });
    for (const key of ["s", "i", "p"]) {
      const output = row.querySelector(`[data-armor-total="${key}"]`);
      if (output) output.textContent = String(totals[key]);
    }
  }

  function numericValue(value) {
    const number = Number(String(value ?? "").trim());
    return Number.isFinite(number) ? number : 0;
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

          const sourceLabel = dt.textContent.trim();
          const value = dd.textContent.trim();
          details.set(sourceLabel, value);

          let displayLabel = sourceLabel;
          if (sourceLabel === "ス") displayLabel = category === "vehicle" ? "ス" : "スロット";
          if (sourceLabel === "住宅 登") displayLabel = "登場";
          if (category === "vehicle") {
            if (sourceLabel === "防御S") displayLabel = "S";
            if (sourceLabel === "防御P") displayLabel = "P";
            if (sourceLabel === "防御I") displayLabel = "I";
          }
          dt.textContent = displayLabel;
          details.set(displayLabel, value);
        });

        cleanCastDescription(row, category, details);
        moveCastPageToEnd(detailRow);

        const hidden = new Set(CAST_HIDDEN_DETAIL_LABELS[category] || []);
        let visibleCount = 0;
        detailRow.querySelectorAll(".cast-outfit-ofc-details > div").forEach(item => {
          const label = item.querySelector("dt")?.textContent?.trim() || "";
          const isHidden = hidden.has(label);
          item.classList.toggle("cast-outfit-detail-hidden", isHidden);
          if (!isHidden) visibleCount += 1;
        });
        detailRow.classList.toggle("cast-outfit-detail-row-hidden", visibleCount === 0);
      });
    });
  }

  function moveCastPageToEnd(detailRow) {
    const list = detailRow.querySelector(".cast-outfit-ofc-details");
    const pageItem = [...(list?.children || [])]
      .find(item => item.querySelector("dt")?.textContent?.trim() === "参照P");
    if (list && pageItem && pageItem !== list.lastElementChild) list.append(pageItem);
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

    if (category === "cyberware") {
      const ianus = [
        ["IANUS 表", "表"], ["IANUS 深", "深"], ["IANUS 無", "無"]
      ].map(([source, label]) => details.get(source) ? `${label}：${details.get(source)}` : "").filter(Boolean);
      if (ianus.length) retained.push(ianus.join("、"));
    }

    if (category === "tron") {
      const labels = [
        ["OFC大分類", "OFC大分類"], ["OFC小分類", "OFC小分類"], ["メーカー", "メーカー"],
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
