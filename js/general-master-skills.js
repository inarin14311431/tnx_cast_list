/* Keep the built-in General-skill rows in their default positions without
 * rebuilding or repeatedly moving rows while the user is typing.
 * 製作：・芸術：・操縦： may contain a specialization after the colon;
 * the first saved row for each prefix is treated as the built-in slot.
 * Additional rows with the same prefix remain ordinary added skills. */
(() => {
  const LEFT_MASTER = ["医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉"];
  const RIGHT_MASTER = ["芸術：", "運動", "回避", "白兵", "操縦：", "信用", "圧力", "隠密"];
  const PROPER_PREFIXES = new Set(["製作：", "芸術：", "操縦："]);

  let queued = false;
  let arranging = false;
  let observer = null;

  const rowName = row => row?.querySelector('[data-f="name"]')?.value?.trim() || "";
  const isMatch = (name, master) => PROPER_PREFIXES.has(master) ? name.startsWith(master) : name === master;

  function removeDelete(row) {
    row.dataset.fixedGeneralMaster = "1";
    row.querySelector('[data-delete-skill]')?.remove();
  }

  function selectMasterRow(master, rows, used) {
    const matches = rows.filter(row => !used.has(row) && isMatch(rowName(row), master));
    if (!matches.length) return null;
    if (!PROPER_PREFIXES.has(master)) return matches[0];
    return matches.find(row => rowName(row) !== master) || matches[0];
  }

  function orderedRows(body, masters, allRows, used) {
    const fixed = [];
    for (const master of masters) {
      const selected = selectMasterRow(master, allRows, used);
      if (!selected) continue;
      used.add(selected);
      removeDelete(selected);
      fixed.push(selected);
    }

    const remaining = [...body.rows].filter(row => !fixed.includes(row));
    return [...fixed, ...remaining];
  }

  function applyOrder(body, desired) {
    if (!body) return;
    desired.forEach((row, index) => {
      const current = body.rows[index];
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
      const used = new Set();
      const leftOrder = orderedRows(firstBody, LEFT_MASTER, allRows, used);
      const rightOrder = orderedRows(secondBody, RIGHT_MASTER, allRows, used);
      applyOrder(firstBody, leftOrder);
      applyOrder(secondBody, rightOrder);
    } finally {
      arranging = false;
      observer?.observe(root, { childList: true, subtree: true });
    }
  }

  function queue() {
    if (queued || arranging) return;
    queued = true;
    requestAnimationFrame(arrange);
  }

  function initialize() {
    const root = document.querySelector("#general-skills");
    if (!root) {
      setTimeout(initialize, 80);
      return;
    }

    observer = new MutationObserver(queue);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("tnx:general-master-ready", queue);
    queue();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();