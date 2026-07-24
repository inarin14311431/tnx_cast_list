/* Promote the three level-0 proper-name master rows without visibly adding a
 * second row. The real editor skill is created internally, then the original
 * fixed-position row adopts that skill key and continues as the editable row. */
(() => {
  const MASTER_NAMES = ["製作：", "芸術：", "操縦："];
  const SUITS = ["reason", "passion", "life", "mundane"];
  const converting = new Set();

  function generalGroups() {
    return [...document.querySelectorAll("#general-skills > .skill-group")].filter(group => {
      const title = group.querySelector(".skill-group-title")?.textContent || "";
      return title.includes("一般技能");
    });
  }

  function rows() {
    return generalGroups().flatMap(group => [...group.querySelectorAll("tbody tr[data-skill-key]")]);
  }

  function rowName(row) {
    return String(row?.querySelector('[data-f="name"]')?.value || "").trim().normalize("NFC");
  }

  function exactMasterName(row) {
    const name = rowName(row);
    return MASTER_NAMES.includes(name) ? name : "";
  }

  function suitInputs(row) {
    return Object.fromEntries(SUITS.map(suit => [suit, row?.querySelector(`[data-f="${suit}"]`)]));
  }

  function selectedSuits(row) {
    const inputs = suitInputs(row);
    return Object.fromEntries(SUITS.map(suit => [suit, Boolean(inputs[suit]?.checked)]));
  }

  function selectedCount(row) {
    const state = selectedSuits(row);
    return SUITS.filter(suit => state[suit]).length;
  }

  function setControl(control, value, dispatch = true) {
    if (!control) return;
    if (control.type === "checkbox") control.checked = Boolean(value);
    else control.value = String(value ?? "");
    if (!dispatch) return;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function restoreScroll(position) {
    window.scrollTo(position.x, position.y);
    requestAnimationFrame(() => window.scrollTo(position.x, position.y));
  }

  function adoptRealSkill(realRow, name, desired, scrollPosition) {
    const realKey = realRow.dataset.skillKey;
    const level = SUITS.filter(suit => desired[suit]).length;

    setControl(realRow.querySelector('[data-f="skill_kind"]'), "proper");
    setControl(realRow.querySelector('[data-f="name"]'), name);
    SUITS.forEach(suit => setControl(realRow.querySelector(`[data-f="${suit}"]`), desired[suit]));
    setControl(realRow.querySelector('[data-f="level"]'), level);

    /* add-general rerenders the table before the real row is configured. Find
       the newly generated fixed-position master row and make it point at the
       real skill object. Its existing handlers read data-skill-key at event
       time, so subsequent edits use the real core record. */
    const fixedRow = rows().find(candidate => {
      return candidate.dataset.skillKey !== realKey
        && rowName(candidate) === name
        && Number(candidate.querySelector('[data-f="level"]')?.value || 0) === 0
        && selectedCount(candidate) === 0;
    });

    if (!fixedRow) {
      restoreScroll(scrollPosition);
      return;
    }

    fixedRow.dataset.skillKey = realKey;
    const deleteButton = fixedRow.querySelector("[data-delete-skill]");
    if (deleteButton) deleteButton.dataset.deleteSkill = realKey;

    setControl(fixedRow.querySelector('[data-f="skill_kind"]'), "proper", false);
    setControl(fixedRow.querySelector('[data-f="name"]'), name, false);
    SUITS.forEach(suit => setControl(fixedRow.querySelector(`[data-f="${suit}"]`), desired[suit], false));
    setControl(fixedRow.querySelector('[data-f="level"]'), level, false);

    /* The lower temporary row represented the same real skill only during the
       conversion. Removing it from the DOM keeps the original left/right table
       position and prevents any visible first-click duplication. */
    realRow.remove();
    restoreScroll(scrollPosition);
  }

  function promoteSyntheticRow(row, name) {
    if (converting.has(name)) return;

    const desired = selectedSuits(row);
    if (!SUITS.some(suit => desired[suit])) return;

    const addButton = document.querySelector("#add-general");
    if (!addButton) return;

    converting.add(name);
    const scrollPosition = { x: window.scrollX, y: window.scrollY };

    try {
      const beforeKeys = new Set(rows().map(candidate => candidate.dataset.skillKey));
      addButton.click();
      restoreScroll(scrollPosition);

      const realRow = [...rows()].reverse().find(candidate => {
        return !beforeKeys.has(candidate.dataset.skillKey) && rowName(candidate) === "";
      });
      if (!realRow) return;

      adoptRealSkill(realRow, name, desired, scrollPosition);
    } finally {
      converting.delete(name);
    }
  }

  document.addEventListener("input", event => {
    const box = event.target.closest?.('input[data-f="reason"],input[data-f="passion"],input[data-f="life"],input[data-f="mundane"]');
    const row = box?.closest("tr[data-skill-key]");
    const name = exactMasterName(row);
    if (!box || !row || !name || converting.has(name)) return;

    const count = selectedCount(row);
    const level = row.querySelector('[data-f="level"]');
    const current = Math.max(0, Number(level?.value || 0));

    /* A real row is updated by sheet.js before this listener. A synthetic row
       is the only case where a checked suit still leaves the level at zero. */
    if (count > 0 && current === 0) {
      promoteSyntheticRow(row, name);
      return;
    }

    /* Core processing raises levels but does not lower them when a suit is
       cleared. Proper-name General skills always follow the selected suit count. */
    if (level && current !== count) {
      level.value = String(count);
      level.dispatchEvent(new Event("input", { bubbles: true }));
      level.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  function notifyReady() {
    const root = document.querySelector("#general-skills");
    if (!root?.querySelector("tr[data-skill-key]")) {
      setTimeout(notifyReady, 80);
      return;
    }
    window.dispatchEvent(new CustomEvent("tnx:general-master-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", notifyReady, { once: true });
  } else {
    notifyReady();
  }
})();