/* Promote only synthetic level-0 proper-name master rows after the core editor
 * has had the first chance to process a suit change. This lets 製作：, 芸術：
 * and 操縦： use exactly the same path, including previously saved level-0 rows. */
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

  function setControl(control, value) {
    if (!control) return;
    if (control.type === "checkbox") control.checked = Boolean(value);
    else control.value = String(value ?? "");
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function restoreScroll(position) {
    window.scrollTo(position.x, position.y);
    requestAnimationFrame(() => window.scrollTo(position.x, position.y));
  }

  function promoteSyntheticRow(row, name) {
    if (converting.has(name)) return;

    const desired = selectedSuits(row);
    const level = SUITS.filter(suit => desired[suit]).length;
    if (level === 0) return;

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

      const realKey = realRow.dataset.skillKey;
      setControl(realRow.querySelector('[data-f="skill_kind"]'), "proper");
      setControl(realRow.querySelector('[data-f="name"]'), name);
      SUITS.forEach(suit => setControl(realRow.querySelector(`[data-f="${suit}"]`), desired[suit]));
      setControl(realRow.querySelector('[data-f="level"]'), level);

      /* The generated master row is not part of the core skills array. Clicking
         its delete button only forces a clean rerender; the newly promoted row
         remains and becomes the sole displayed row for this exact name. */
      const synthetic = rows().find(candidate => {
        return candidate.dataset.skillKey !== realKey
          && rowName(candidate) === name
          && Number(candidate.querySelector('[data-f="level"]')?.value || 0) === 0
          && selectedCount(candidate) === 0;
      });
      synthetic?.querySelector("[data-delete-skill]")?.click();
      restoreScroll(scrollPosition);
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

    /* A real row is updated by sheet.js before this document-level listener.
       Only a synthetic master row still has level 0 after a suit is selected. */
    if (count > 0 && current === 0) {
      promoteSyntheticRow(row, name);
      return;
    }

    /* Existing real rows, including older saved level-0 製作： records, stay in
       place. Keep their level equal to the number of selected suits. */
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
