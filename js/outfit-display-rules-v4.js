/* Finalized category-specific outfit layouts and field mappings. */
(() => {
  const SHEET_ROOT = "#outfit-list";
  const CAST_ROOT = "#outfit-container";
  const HIDDEN = "outfit-rule-v4-hidden";
  let queued = false;

  const LAYOUTS = {
    weapon: [
      ["base", "category", "分類"], ["base", "name", "名称"],
      ["base", "purchase_value", "購入"], ["base", "experience_cost", "常備化"],
      ["base", "concealment", "隠匿"], ["base", "attack", "攻撃"],
      ["ofc", "parry", "受け"], ["base", "range", "射程"],
      ["ofc", "speed", "スロ"], ["ofc", "electronic_control", "電制"],
      ["base", "slot", "部位"], ["base", "description", "解説"],
      ["ofc", "page_number", "参照P"], ["base", "actions", ""]
    ],
    armor: [
      ["base", "category", "分類"], ["base", "name", "名称"],
      ["base", "purchase_value", "購入"], ["base", "experience_cost", "常備化"],
      ["base", "concealment", "隠匿"], ["base", "defense_s", "S"],
      ["base", "defense_i", "I"], ["base", "defense_p", "P"],
      ["ofc", "electronic_control", "電制"], ["ofc", "control_value", "制御"],
      ["base", "slot", "部位"], ["base", "description", "解説"],
      ["ofc", "page_number", "参照P"], ["base", "actions", ""]
    ],
    cyberware: [
      ["base", "category", "分類"], ["base", "name", "名称"],
      ["base", "purchase_value", "購入"], ["base", "experience_cost", "常備化"],
      ["base", "concealment", "隠匿"], ["ofc", "electronic_control", "電制"],
      ["base", "control_modifier", "制御"], ["base", "slot", "部位"],
      ["base", "description", "解説"], ["ofc", "page_number", "参照P"],
      ["base", "actions", ""]
    ],
    tron: [
      ["base", "category", "分類"], ["base", "name", "名称"],
      ["base", "purchase_value", "購入"], ["base", "experience_cost", "常備化"],
      ["base", "concealment", "隠匿"], ["base", "control_modifier", "制御"],
      ["ofc", "electronic_control", "電制"], ["ofc", "speed", "スロ"],
      ["ofc", "tron_software", "ソ"], ["ofc", "tron_support", "サ"],
      ["ofc", "tron_hardware", "ハ"], ["ofc", "cs_value", "CS"],
      ["base", "slot", "部位"], ["base", "description", "解説"],
      ["ofc", "page_number", "参照P"], ["base", "actions", ""]
    ],
    vehicle: [
      ["base", "category", "分類"], ["base", "name", "名称"],
      ["base", "purchase_value", "購入"], ["base", "experience_cost", "常備化"],
      ["base", "concealment", "隠匿"], ["base", "attack", "攻撃"],
      ["base", "control_modifier", "制御"], ["ofc", "speed", "スロ"],
      ["ofc", "electronic_control", "電制"], ["ofc", "defense_s", "S"],
      ["ofc", "defense_p", "P"], ["ofc", "defense_i", "I"],
      ["ofc", "crew", "乗員"], ["ofc", "sf", "SF"],
      ["base", "description", "解説"], ["ofc", "page_number", "参照P"],
      ["base", "actions", ""]
    ],
    residence: [
      ["base", "category", "分類"], ["base", "name", "名称"],
      ["base", "purchase_value", "購入"], ["base", "experience_cost", "常備化"],
      ["base", "slot", "部位"], ["ofc", "speed", "スロ"],
      ["ofc", "electronic_control", "電制"], ["ofc", "residence_entry", "登場"],
      ["synthetic", "residence_electric_area", "電/ア"],
      ["base", "description", "解説"], ["ofc", "page_number", "参照P"],
      ["base", "actions", ""]
    ],
    other: [
      ["base", "category", "分類"], ["base", "name", "名称"],
      ["base", "purchase_value", "購入"], ["base", "experience_cost", "常備化"],
      ["base", "concealment", "隠匿"], ["base", "slot", "部位"],
      ["base", "description", "解説"], ["ofc", "page_number", "参照P"],
      ["base", "actions", ""]
    ]
  };

  initialize();

  function initialize() {
    const root = document.querySelector(SHEET_ROOT) || document.querySelector(CAST_ROOT);
    if (!root) return;
    new MutationObserver(queueApply).observe(root, { childList: true, subtree: true });
    document.addEventListener("input", handleSyntheticInput, true);
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
      applySheetLayouts();
      applyCastLabels();
    });
  }

  function applySheetLayouts() {
    document.querySelectorAll(`${SHEET_ROOT} table[data-outfit-schema]`).forEach(table => {
      const category = table.dataset.outfitSchema || "other";
      const layout = LAYOUTS[category] || LAYOUTS.other;
      ensureSyntheticResidenceColumn(table, category);
      const keys = new Set(layout.map(([type, key]) => `${type}:${key}`));

      [...table.querySelectorAll("thead tr > th")].forEach(head => {
        const identity = identifyHeader(head);
        head.classList.toggle(HIDDEN, !identity || !keys.has(identity));
      });
      table.querySelectorAll("tbody > tr").forEach(row => {
        [...row.children].forEach(cell => {
          const identity = identifyCell(cell);
          cell.classList.toggle(HIDDEN, !identity || !keys.has(identity));
        });
      });

      const headRow = table.querySelector("thead tr");
      for (const [type, key, label] of layout) {
        const head = findHeader(table, type, key);
        if (head) {
          head.textContent = label;
          head.classList.remove(HIDDEN);
          headRow.append(head);
        }
        table.querySelectorAll("tbody > tr").forEach(row => {
          const cell = findCell(row, type, key);
          if (cell) {
            cell.classList.remove(HIDDEN);
            row.append(cell);
          }
        });
      }

      applyInputLimits(table, category);
      if (category === "armor") window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    });
  }

  function identifyHeader(cell) {
    if (cell.dataset.ofcHead) return `ofc:${cell.dataset.ofcHead}`;
    if (cell.dataset.syntheticHead) return `synthetic:${cell.dataset.syntheticHead}`;
    const match = [...cell.classList].find(name => name.startsWith("outfit-table-head--") && name !== "outfit-table-head--ofc");
    return match ? `base:${match.replace("outfit-table-head--", "")}` : "";
  }

  function identifyCell(cell) {
    if (cell.dataset.ofcCell) return `ofc:${cell.dataset.ofcCell}`;
    if (cell.dataset.syntheticCell) return `synthetic:${cell.dataset.syntheticCell}`;
    const match = [...cell.classList].find(name => name.startsWith("outfit-table-cell--") && name !== "outfit-table-cell--ofc");
    return match ? `base:${match.replace("outfit-table-cell--", "")}` : "";
  }

  function findHeader(table, type, key) {
    if (type === "ofc") return table.querySelector(`[data-ofc-head="${key}"]`);
    if (type === "synthetic") return table.querySelector(`[data-synthetic-head="${key}"]`);
    return table.querySelector(`.outfit-table-head--${key}`);
  }

  function findCell(row, type, key) {
    if (type === "ofc") return row.querySelector(`[data-ofc-cell="${key}"]`);
    if (type === "synthetic") return row.querySelector(`[data-synthetic-cell="${key}"]`);
    return row.querySelector(`.outfit-table-cell--${key}`);
  }

  function ensureSyntheticResidenceColumn(table, category) {
    if (category !== "residence") return;
    const headRow = table.querySelector("thead tr");
    if (headRow && !headRow.querySelector('[data-synthetic-head="residence_electric_area"]')) {
      const th = document.createElement("th");
      th.className = "outfit-table-head outfit-table-head--residence-electric-area";
      th.dataset.syntheticHead = "residence_electric_area";
      th.textContent = "電/ア";
      headRow.append(th);
    }

    table.querySelectorAll("tbody > tr[data-outfit-key]").forEach(row => {
      let cell = row.querySelector('[data-synthetic-cell="residence_electric_area"]');
      if (!cell) {
        cell = document.createElement("td");
        cell.className = "outfit-table-cell outfit-table-cell--residence-electric-area";
        cell.dataset.syntheticCell = "residence_electric_area";
        const input = document.createElement("input");
        input.type = "text";
        input.dataset.residenceElectricArea = "1";
        input.autocomplete = "off";
        input.setAttribute("aria-label", "電/ア");
        cell.append(input);
        row.append(cell);
      }
      syncResidenceComposite(row);
    });
  }

  function syncResidenceComposite(row) {
    const composite = row.querySelector("[data-residence-electric-area]");
    if (!composite || document.activeElement === composite) return;
    const electric = row.querySelector('[data-ofc="residence_electric"]')?.value || "";
    const analog = row.querySelector('[data-ofc="residence_area"]')?.value || "";
    const next = electric || analog ? `${electric}/${analog}` : "";
    if (composite.value !== next) composite.value = next;
  }

  function handleSyntheticInput(event) {
    const input = event.target.closest?.("[data-residence-electric-area]");
    if (!input) return;
    const row = input.closest("tr[data-outfit-key]");
    if (!row) return;
    const [electric = "", ...rest] = String(input.value || "").split(/[\/／]/);
    const analog = rest.join("/");
    setOfcValue(row, "residence_electric", electric.trim());
    setOfcValue(row, "residence_area", analog.trim());
  }

  function setOfcValue(row, key, value) {
    const field = row.querySelector(`[data-ofc="${key}"]`);
    if (!field || field.value === value) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyInputLimits(table, category) {
    limitDigits(table, '[data-o="purchase_value"]', 3);
    limitDigits(table, '[data-o="experience_cost"]', 3);
    limitDigits(table, '[data-ofc="page_number"]', 3);
    limitDigits(table, '[data-ofc="speed"]', 1);

    if (category === "tron") {
      for (const key of ["tron_software", "tron_support", "tron_hardware"]) {
        limitDigits(table, `[data-ofc="${key}"]`, 2);
      }
    }
  }

  function limitDigits(root, selector, maxLength) {
    root.querySelectorAll(selector).forEach(field => {
      field.maxLength = maxLength;
      field.inputMode = "numeric";
      if (field.dataset.digitLimitBound === String(maxLength)) return;
      field.dataset.digitLimitBound = String(maxLength);
      field.addEventListener("input", () => {
        const next = String(field.value || "").replace(/\D/g, "").slice(0, maxLength);
        if (field.value !== next) field.value = next;
      });
    });
  }

  function applyCastLabels() {
    document.querySelectorAll(`${CAST_ROOT} .cast-outfit-ofc-details dt`).forEach(dt => {
      const labels = {
        "受": "受け", "ス": "スロ", "制御値": "制御", "住宅 登": "登場",
        "住宅 電": "電", "住宅 ア": "ア", "トロン ソ": "ソ",
        "トロン サ": "サ", "トロン ハ": "ハ"
      };
      const current = dt.textContent.trim();
      if (labels[current]) dt.textContent = labels[current];
    });
  }
})();