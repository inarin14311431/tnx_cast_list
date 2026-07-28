/* Stable finalized outfit layout controller. */
(() => {
  const SHEET_ROOT = "#outfit-list";
  const CAST_ROOT = "#outfit-container";
  const HIDDEN = "outfit-rule-v4-hidden";
  const root = document.querySelector(SHEET_ROOT) || document.querySelector(CAST_ROOT);
  if (!root) return;

  const LAYOUTS = {
    weapon: [["base","category","分類"],["base","name","名称"],["base","purchase_value","購入"],["base","experience_cost","常備化"],["base","concealment","隠匿"],["base","attack","攻撃"],["ofc","parry","受け"],["base","range","射程"],["ofc","speed","スロ"],["ofc","electronic_control","電制"],["base","slot","部位"],["base","description","解説"],["ofc","page_number","参照P"],["base","actions",""]],
    armor: [["base","category","分類"],["base","name","名称"],["base","purchase_value","購入"],["base","experience_cost","常備化"],["base","concealment","隠匿"],["base","defense_s","S"],["base","defense_i","I"],["base","defense_p","P"],["ofc","electronic_control","電制"],["ofc","control_value","制御"],["base","slot","部位"],["base","description","解説"],["ofc","page_number","参照P"],["base","actions",""]],
    cyberware: [["base","category","分類"],["base","name","名称"],["base","purchase_value","購入"],["base","experience_cost","常備化"],["base","concealment","隠匿"],["ofc","electronic_control","電制"],["base","control_modifier","制御"],["base","slot","部位"],["base","description","解説"],["ofc","page_number","参照P"],["base","actions",""]],
    tron: [["base","category","分類"],["base","name","名称"],["base","purchase_value","購入"],["base","experience_cost","常備化"],["base","concealment","隠匿"],["base","control_modifier","制御"],["ofc","electronic_control","電制"],["ofc","speed","スロ"],["ofc","tron_software","ソ"],["ofc","tron_support","サ"],["ofc","tron_hardware","ハ"],["ofc","cs_value","CS"],["base","slot","部位"],["base","description","解説"],["ofc","page_number","参照P"],["base","actions",""]],
    vehicle: [["base","category","分類"],["base","name","名称"],["base","purchase_value","購入"],["base","experience_cost","常備化"],["base","concealment","隠匿"],["base","attack","攻撃"],["base","control_modifier","制御"],["ofc","speed","スロ"],["ofc","electronic_control","電制"],["ofc","defense_s","S"],["ofc","defense_p","P"],["ofc","defense_i","I"],["ofc","crew","乗員"],["ofc","sf","SF"],["base","description","解説"],["ofc","page_number","参照P"],["base","actions",""]],
    residence: [["base","category","分類"],["base","name","名称"],["base","purchase_value","購入"],["base","experience_cost","常備化"],["base","slot","部位"],["ofc","speed","スロ"],["ofc","electronic_control","電制"],["ofc","residence_entry","登場"],["synthetic","residence_electric_area","電/ア"],["base","description","解説"],["ofc","page_number","参照P"],["base","actions",""]],
    other: [["base","category","分類"],["base","name","名称"],["base","purchase_value","購入"],["base","experience_cost","常備化"],["base","concealment","隠匿"],["base","slot","部位"],["base","description","解説"],["ofc","page_number","参照P"],["base","actions",""]]
  };

  let queued = false;
  let applying = false;
  const observer = new MutationObserver(() => queueApply());

  function observe() {
    observer.observe(root, { childList: true, subtree: true });
  }

  function queueApply() {
    if (queued || applying) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  function apply() {
    queued = false;
    if (applying) return;
    applying = true;
    observer.disconnect();
    try {
      applySheetLayouts();
      applyCastLabels();
    } finally {
      applying = false;
      observe();
    }
  }

  function applySheetLayouts() {
    document.querySelectorAll(`${SHEET_ROOT} table[data-outfit-schema]`).forEach(table => {
      const category = table.dataset.outfitSchema || "other";
      const layout = LAYOUTS[category] || LAYOUTS.other;
      ensureResidenceComposite(table, category);
      const allowed = new Set(layout.map(([type,key]) => `${type}:${key}`));

      table.querySelectorAll("thead tr > th").forEach(cell => {
        const id = identifyHeader(cell);
        cell.classList.toggle(HIDDEN, !id || !allowed.has(id));
        cell.classList.remove("outfit-rule-hidden");
      });
      table.querySelectorAll("tbody > tr").forEach(row => {
        [...row.children].forEach(cell => {
          const id = identifyCell(cell);
          cell.classList.toggle(HIDDEN, !id || !allowed.has(id));
          cell.classList.remove("outfit-rule-hidden");
        });
      });

      const headRow = table.querySelector("thead tr");
      const desiredHeads = layout.map(([type,key,label]) => {
        const cell = findHeader(table,type,key);
        if (cell) { cell.textContent = label; cell.classList.remove(HIDDEN); }
        return cell;
      }).filter(Boolean);
      desiredHeads.forEach((cell,index) => moveToIndex(headRow,cell,index));

      table.querySelectorAll("tbody > tr").forEach(row => {
        const desired = layout.map(([type,key]) => findCell(row,type,key)).filter(Boolean);
        desired.forEach((cell,index) => moveToIndex(row,cell,index));
      });

      applyInputLimits(table,category);
    });
  }

  function moveToIndex(parent,node,index) {
    const current = parent.children[index];
    if (current === node) return;
    parent.insertBefore(node,current || null);
  }

  function identifyHeader(cell) {
    if (cell.dataset.ofcHead) return `ofc:${cell.dataset.ofcHead}`;
    if (cell.dataset.syntheticHead) return `synthetic:${cell.dataset.syntheticHead}`;
    const name = [...cell.classList].find(v => v.startsWith("outfit-table-head--") && v !== "outfit-table-head--ofc");
    return name ? `base:${name.replace("outfit-table-head--","")}` : "";
  }

  function identifyCell(cell) {
    if (cell.dataset.ofcCell) return `ofc:${cell.dataset.ofcCell}`;
    if (cell.dataset.syntheticCell) return `synthetic:${cell.dataset.syntheticCell}`;
    const name = [...cell.classList].find(v => v.startsWith("outfit-table-cell--") && v !== "outfit-table-cell--ofc");
    return name ? `base:${name.replace("outfit-table-cell--","")}` : "";
  }

  function findHeader(table,type,key) {
    if (type === "ofc") return table.querySelector(`[data-ofc-head="${key}"]`);
    if (type === "synthetic") return table.querySelector(`[data-synthetic-head="${key}"]`);
    return table.querySelector(`.outfit-table-head--${key}`);
  }

  function findCell(row,type,key) {
    if (type === "ofc") return row.querySelector(`[data-ofc-cell="${key}"]`);
    if (type === "synthetic") return row.querySelector(`[data-synthetic-cell="${key}"]`);
    return row.querySelector(`.outfit-table-cell--${key}`);
  }

  function ensureResidenceComposite(table,category) {
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
        input.setAttribute("aria-label","電/ア");
        cell.append(input);
        row.append(cell);
      }
      syncResidenceComposite(row);
    });
  }

  function syncResidenceComposite(row) {
    const field = row.querySelector("[data-residence-electric-area]");
    if (!field || document.activeElement === field) return;
    const electric = row.querySelector('[data-ofc="residence_electric"]')?.value || "";
    const analog = row.querySelector('[data-ofc="residence_area"]')?.value || "";
    const next = electric || analog ? `${electric}/${analog}` : "";
    if (field.value !== next) field.value = next;
  }

  function setOfcValue(row,key,value) {
    const field = row.querySelector(`[data-ofc="${key}"]`);
    if (!field || field.value === value) return;
    field.value = value;
    field.dispatchEvent(new Event("input",{bubbles:true}));
    field.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function limitDigits(root,selector,maxLength) {
    root.querySelectorAll(selector).forEach(field => {
      field.maxLength = maxLength;
      field.inputMode = "numeric";
      if (field.dataset.stableDigitLimit === String(maxLength)) return;
      field.dataset.stableDigitLimit = String(maxLength);
      field.addEventListener("input",() => {
        const next = String(field.value || "").replace(/\D/g,"").slice(0,maxLength);
        if (field.value !== next) field.value = next;
      });
    });
  }

  function applyInputLimits(table,category) {
    limitDigits(table,'[data-o="purchase_value"]',3);
    limitDigits(table,'[data-o="experience_cost"]',3);
    limitDigits(table,'[data-ofc="page_number"]',3);
    limitDigits(table,'[data-ofc="speed"]',1);
    if (category === "tron") ["tron_software","tron_support","tron_hardware"].forEach(key => limitDigits(table,`[data-ofc="${key}"]`,2));
  }

  function applyCastLabels() {
    document.querySelectorAll(`${CAST_ROOT} .cast-outfit-ofc-details dt`).forEach(dt => {
      const labels = {"受":"受け","ス":"スロ","制御値":"制御","住宅 登":"登場","住宅 電":"電","住宅 ア":"ア","トロン ソ":"ソ","トロン サ":"サ","トロン ハ":"ハ"};
      const current = dt.textContent.trim();
      if (labels[current]) dt.textContent = labels[current];
    });
  }

  document.addEventListener("input",event => {
    const input = event.target.closest?.("[data-residence-electric-area]");
    if (!input) return;
    const row = input.closest("tr[data-outfit-key]");
    if (!row) return;
    const [electric="",...rest] = String(input.value || "").split(/[\/／]/);
    setOfcValue(row,"residence_electric",electric.trim());
    setOfcValue(row,"residence_area",rest.join("/").trim());
  },true);

  observe();
  queueApply();
  setTimeout(queueApply,120);
  setTimeout(queueApply,500);
  setTimeout(queueApply,1200);
})();