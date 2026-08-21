/*
 * Authoritative General-skill layout layer.
 *
 * Rules:
 * - 製作：・芸術：・操縦： always have a built-in 0Lv slot.
 * - The built-in slot stays at its default position and cannot be deleted.
 * - The first saved specialization for each prefix occupies that built-in slot.
 * - Additional General skills are independent rows and remain deleteable.
 * - Initial General skills stay at Lv1+ and keep their starting suit.
 * - This layer never rebuilds rows while the user is typing.
 */
(async()=>{
  await import("./general-initial-skill-rules.js?v=1");
  const { GENERAL_MASTER_ROWS, MUTABLE_GENERAL_PREFIXES } = await import("./general-skill-catalog.js?v=2");
  const masterNames = GENERAL_MASTER_ROWS.map(([name]) => name);
  const LEFT_MASTER = masterNames.slice(0, 8);
  const RIGHT_MASTER = masterNames.slice(8);
  const PROPER_PREFIXES = new Set(MUTABLE_GENERAL_PREFIXES);

  let observer = null;
  let queued = false;
  let arranging = false;

  const rowName = row => String(row?.querySelector('[data-f="name"]')?.value || "").trim();
  const isExact = (name, master) => name === master;
  const isFamily = (name, master) => PROPER_PREFIXES.has(master) ? name.startsWith(master) : name === master;

  function selectBuiltIn(master, allRows, used) {
    const family = allRows.filter(row => !used.has(row) && isFamily(rowName(row), master));
    if (!family.length) return null;
    if (!PROPER_PREFIXES.has(master)) return family[0];
    return family.find(row => !isExact(rowName(row), master)) || family.find(row => isExact(rowName(row), master)) || null;
  }

  function markFixed(row) {
    if (!row) return;
    row.hidden = false;
    row.style.removeProperty("display");
    row.dataset.fixedGeneralMaster = "1";
    row.querySelector('[data-delete-skill]')?.remove();
  }

  function hideDuplicateBareRows(master, selected, allRows) {
    if (!PROPER_PREFIXES.has(master) || !selected) return;
    const selectedName = rowName(selected);
    for (const row of allRows) {
      if (row === selected) continue;
      if (rowName(row) !== master) continue;
      if (selectedName === master) continue;
      row.hidden = true;
      row.style.setProperty("display", "none", "important");
      row.dataset.generatedGeneralPlaceholder = "1";
    }
  }

  function desiredRows(body, masters, allRows, used) {
    const fixed = [];
    for (const master of masters) {
      const row = selectBuiltIn(master, allRows, used);
      if (!row) continue;
      used.add(row);
      markFixed(row);
      hideDuplicateBareRows(master, row, allRows);
      fixed.push(row);
    }

    const remaining = [...body.rows].filter(row => {
      if (fixed.includes(row)) return false;
      if (row.hidden || row.dataset.generatedGeneralPlaceholder === "1") return false;
      return true;
    });
    return [...fixed, ...remaining];
  }

  function applyOrder(body, desired) {
    if (!body) return;
    desired.forEach((row, index) => {
      const visible = [...body.rows].filter(item => !item.hidden);
      const current = visible[index];
      if (current !== row) body.insertBefore(row, current || null);
    });
  }

  function arrange() {
    queued = false;
    if (arranging) return;
    const root = document.querySelector("#general-skills");
    if (!root) return;
    const firstBody = root.querySelector(".general-skill-column--first tbody");
    const secondBody = root.querySelector(".general-skill-column--second tbody");
    if (!firstBody || !secondBody) {
      queue();
      return;
    }

    arranging = true;
    observer?.disconnect();
    try {
      const allRows = [...root.querySelectorAll('tr[data-skill-key]')];
      allRows.forEach(row => {
        delete row.dataset.fixedGeneralMaster;
        if (row.dataset.generatedGeneralPlaceholder !== "1") {
          row.hidden = false;
          row.style.removeProperty("display");
        }
      });
      const used = new Set();
      applyOrder(firstBody, desiredRows(firstBody, LEFT_MASTER, allRows, used));
      applyOrder(secondBody, desiredRows(secondBody, RIGHT_MASTER, allRows, used));
    } finally {
      arranging = false;
      observer?.observe(root, { childList: true, subtree: true });
    }
  }

  function queue() {
    if (queued || arranging) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(arrange));
  }

  function initializeGeneralMasterSkills() {
    const root = document.querySelector("#general-skills");
    if (!root) {
      setTimeout(initializeGeneralMasterSkills, 80);
      return;
    }
    if (root.dataset.generalMasterSkillsInitialized === "1") return;
    root.dataset.generalMasterSkillsInitialized = "1";
    observer = new MutationObserver(queue);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("tnx:general-master-ready", queue);
    queue();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeGeneralMasterSkills, { once: true });
  else initializeGeneralMasterSkills();
})().catch(error => console.error("General skill layout initialization failed.", error));
