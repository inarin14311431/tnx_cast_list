/* Convert the three level-0 proper-name master rows into real General skills
 * on their first suit click. The conversion is synchronous so 製作：, 芸術：
 * and 操縦： all use exactly the same stable editor row afterwards. */
(() => {
  const MASTER_NAMES = ["製作：", "芸術：", "操縦："];
  const SUITS = ["reason", "passion", "life", "mundane"];
  const realKeys = new Set();

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
    return (row?.querySelector('[data-f="name"]')?.value || "").trim();
  }

  function exactMasterName(row) {
    const name = rowName(row);
    return MASTER_NAMES.includes(name) ? name : "";
  }

  function suitInputs(row) {
    return Object.fromEntries(SUITS.map(suit => [suit, row?.querySelector(`[data-f="${suit}"]`)]));
  }

  function selectedCount(row) {
    return Object.values(suitInputs(row)).filter(input => input?.checked).length;
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

  function convertMasterRow(row, clickedBox, name) {
    const addButton = document.querySelector("#add-general");
    if (!addButton) return false;

    const desiredSuits = Object.fromEntries(SUITS.map(suit => {
      const input = row.querySelector(`[data-f="${suit}"]`);
      return [suit, input === clickedBox ? !input.checked : Boolean(input?.checked)];
    }));
    const beforeKeys = new Set(rows().map(candidate => candidate.dataset.skillKey));
    const scrollPosition = { x: window.scrollX, y: window.scrollY };

    addButton.click();
    restoreScroll(scrollPosition);

    const realRow = [...rows()].reverse().find(candidate => {
      return !beforeKeys.has(candidate.dataset.skillKey) && rowName(candidate) === "";
    });
    if (!realRow) return false;

    const realKey = realRow.dataset.skillKey;
    realKeys.add(realKey);

    setControl(realRow.querySelector('[data-f="skill_kind"]'), "proper");
    setControl(realRow.querySelector('[data-f="name"]'), name);
    SUITS.forEach(suit => setControl(realRow.querySelector(`[data-f="${suit}"]`), desiredSuits[suit]));
    setControl(realRow.querySelector('[data-f="level"]'), SUITS.filter(suit => desiredSuits[suit]).length);

    /* At this point the DOM still contains the generated level-0 master row.
       Its delete button forces the core editor to rerender. Because the row is
       synthetic, no real skill is removed; the newly created row remains. */
    const duplicate = rows().find(candidate => {
      return candidate.dataset.skillKey !== realKey
        && rowName(candidate) === name
        && Number(candidate.querySelector('[data-f="level"]')?.value || 0) === 0
        && selectedCount(candidate) === 0;
    });
    duplicate?.querySelector("[data-delete-skill]")?.click();
    restoreScroll(scrollPosition);
    return true;
  }

  document.addEventListener("click", event => {
    const label = event.target.closest?.(".suit-check");
    const clickedBox = label?.querySelector('input[data-f="reason"],input[data-f="passion"],input[data-f="life"],input[data-f="mundane"]');
    const row = clickedBox?.closest("tr[data-skill-key]");
    const name = exactMasterName(row);
    if (!clickedBox || !row || !name) return;

    /* Rows created by this script and already acquired rows are handled by the
       editor's normal input handler. Only untouched synthetic level-0 rows are
       intercepted. */
    if (realKeys.has(row.dataset.skillKey) || Number(row.querySelector('[data-f="level"]')?.value || 0) > 0 || selectedCount(row) > 0) {
      realKeys.add(row.dataset.skillKey);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    convertMasterRow(row, clickedBox, name);
  }, true);

  /* Keep the level equal to the number of selected suits for proper-name
     General skills, including names such as 製作：武器. */
  document.addEventListener("input", event => {
    const box = event.target.closest?.('input[data-f="reason"],input[data-f="passion"],input[data-f="life"],input[data-f="mundane"]');
    const row = box?.closest("tr[data-skill-key]");
    const name = rowName(row);
    if (!box || !row || !MASTER_NAMES.some(master => name.startsWith(master))) return;

    requestAnimationFrame(() => {
      const level = row.querySelector('[data-f="level"]');
      if (!level) return;
      const count = selectedCount(row);
      if (Number(level.value || 0) === count) return;
      level.value = String(count);
      level.dispatchEvent(new Event("input", { bubbles: true }));
      level.dispatchEvent(new Event("change", { bubbles: true }));
    });
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
