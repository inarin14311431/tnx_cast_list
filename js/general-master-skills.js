/* Keep the built-in General-skill rows in their default positions.
 * 製作：・芸術：・操縦： may contain a specialization after the colon;
 * the earliest saved row for each prefix is treated as the built-in slot.
 * Additional rows with the same prefix remain ordinary added skills. */
(() => {
  const LEFT_MASTER = ["医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉"];
  const RIGHT_MASTER = ["芸術：", "運動", "回避", "白兵", "操縦：", "信用", "圧力", "隠密"];
  const PROPER_PREFIXES = new Set(["製作：", "芸術：", "操縦："]);

  let queued = false;
  let arranging = false;

  const rowName = row => row?.querySelector('[data-f="name"]')?.value?.trim() || "";

  function isMatch(name, master) {
    return PROPER_PREFIXES.has(master) ? name.startsWith(master) : name === master;
  }

  function removeDelete(row) {
    row.dataset.fixedGeneralMaster = "1";
    row.querySelector('[data-delete-skill]')?.remove();
  }

  function arrangeColumn(body, masters, allRows, used) {
    if (!body) return;

    const fixedRows = [];
    for (const master of masters) {
      const matches = allRows.filter(row => !used.has(row) && isMatch(rowName(row), master));
      if (!matches.length) continue;

      let selected = matches[0];
      if (PROPER_PREFIXES.has(master)) {
        selected = matches.find(row => rowName(row) !== master) || matches[0];

        /* When a specialized saved row exists, hide the generated 0Lv
         * placeholder with the bare prefix. It remains only in sheet.js's
         * temporary state and is excluded from saving. */
        if (rowName(selected) !== master) {
          matches
            .filter(row => row !== selected && rowName(row) === master)
            .forEach(row => row.remove());
        }
      }

      used.add(selected);
      removeDelete(selected);
      fixedRows.push(selected);
    }

    const remaining = [...body.rows].filter(row => !fixedRows.includes(row));
    fixedRows.forEach(row => body.append(row));
    remaining.forEach(row => body.append(row));
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
    try {
      const allRows = [...root.querySelectorAll('tr[data-skill-key]')];
      const used = new Set();

      /* Pull every built-in row into the correct column before ordering. */
      for (const master of LEFT_MASTER) {
        const candidates = allRows.filter(row => !used.has(row) && isMatch(rowName(row), master));
        const selected = PROPER_PREFIXES.has(master)
          ? candidates.find(row => rowName(row) !== master) || candidates[0]
          : candidates[0];
        if (selected) firstBody.append(selected);
      }
      for (const master of RIGHT_MASTER) {
        const candidates = allRows.filter(row => !used.has(row) && isMatch(rowName(row), master));
        const selected = PROPER_PREFIXES.has(master)
          ? candidates.find(row => rowName(row) !== master) || candidates[0]
          : candidates[0];
        if (selected) secondBody.append(selected);
      }

      arrangeColumn(firstBody, LEFT_MASTER, allRows, used);
      arrangeColumn(secondBody, RIGHT_MASTER, allRows, used);
    } finally {
      arranging = false;
    }
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(arrange));
  }

  function initialize() {
    const root = document.querySelector("#general-skills");
    if (!root) {
      setTimeout(initialize, 80);
      return;
    }

    new MutationObserver(queue).observe(root, { childList: true, subtree: true });
    window.addEventListener("tnx:general-master-ready", queue);
    queue();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();