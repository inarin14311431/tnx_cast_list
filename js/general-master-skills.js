/* Bind the fixed General-skill master rows directly to sheet.js.
 * No row is added unless the user explicitly presses the Add General button. */
(() => {
  const MASTER_ORDER = [
    "医療", "射撃", "知覚", "電脳", "製作：",
    "心理", "自我", "交渉", "芸術：",
    "運動", "回避", "白兵", "操縦：",
    "信用", "圧力", "隠密"
  ];
  const PROPER_MASTERS = new Set(["製作：", "芸術：", "操縦："]);
  const SUITS = ["reason", "passion", "life", "mundane"];
  const realKeys = new Set();
  const syntheticKeys = new Map();
  let queued = false;
  let readyNotified = false;

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

  function selectedCount(row) {
    return SUITS.filter(suit => row?.querySelector(`[data-f="${suit}"]`)?.checked).length;
  }

  function isAcquired(row) {
    return Number(row?.querySelector('[data-f="level"]')?.value || 0) > 0 || selectedCount(row) > 0;
  }

  function installUuidSequence() {
    const sequence = MASTER_ORDER
      .map(name => syntheticKeys.get(name))
      .filter(Boolean);

    if (!sequence.length || typeof crypto?.randomUUID !== "function") return () => {};

    const hadOwn = Object.prototype.hasOwnProperty.call(crypto, "randomUUID");
    const ownDescriptor = hadOwn ? Object.getOwnPropertyDescriptor(crypto, "randomUUID") : null;
    const original = crypto.randomUUID.bind(crypto);
    let index = 0;

    try {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        writable: true,
        value: () => sequence[index++] || original()
      });
    } catch (error) {
      console.warn("Unable to bind General master skill key.", error);
      return () => {};
    }

    return () => {
      try {
        if (hadOwn && ownDescriptor) Object.defineProperty(crypto, "randomUUID", ownDescriptor);
        else delete crypto.randomUUID;
      } catch (error) {
        console.warn("Unable to restore randomUUID.", error);
      }
    };
  }

  function wrapControl(row, masterName, element) {
    const key = row.dataset.skillKey;
    const original = element.oninput;
    if (!key || typeof original !== "function") return;
    if (element.dataset.tnxMasterKey === key) return;

    element.dataset.tnxMasterKey = key;
    element.oninput = function(event) {
      if (realKeys.has(key)) return original.call(this, event);

      const restoreUuid = installUuidSequence();
      try {
        original.call(this, event);
        realKeys.add(key);
        syntheticKeys.delete(masterName);
        row.dataset.tnxMasterReal = "1";
      } finally {
        restoreUuid();
      }
    };
  }

  function removeVisibleSyntheticDuplicate(name, realRow) {
    rows().forEach(candidate => {
      if (candidate === realRow || rowName(candidate) !== name) return;
      if (isAcquired(candidate)) return;
      candidate.remove();
    });
  }

  function refresh() {
    queued = false;
    const currentRows = rows();
    if (!currentRows.length) return;

    syntheticKeys.clear();

    for (const row of currentRows) {
      const name = rowName(row);
      if (!MASTER_ORDER.includes(name)) continue;

      const key = row.dataset.skillKey;
      if (!key) continue;

      if (realKeys.has(key) || isAcquired(row)) {
        realKeys.add(key);
        row.dataset.tnxMasterReal = "1";
        if (PROPER_MASTERS.has(name)) removeVisibleSyntheticDuplicate(name, row);
        continue;
      }

      syntheticKeys.set(name, key);
    }

    for (const row of rows()) {
      const name = rowName(row);
      if (!PROPER_MASTERS.has(name)) continue;
      row.querySelectorAll("[data-f]").forEach(element => wrapControl(row, name, element));
    }

    if (!readyNotified) {
      readyNotified = true;
      window.dispatchEvent(new CustomEvent("tnx:general-master-ready"));
    }
  }

  function queueRefresh() {
    if (queued) return;
    queued = true;
    queueMicrotask(refresh);
  }

  function initialize() {
    const root = document.querySelector("#general-skills");
    if (!root) {
      setTimeout(initialize, 80);
      return;
    }

    new MutationObserver(queueRefresh).observe(root, { childList: true, subtree: true });
    queueRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();