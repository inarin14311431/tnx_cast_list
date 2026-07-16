const STORAGE_PREFIX = "tnx-sheet-draft:v1:";
const STATIC_SELECTOR = "input[id], select[id], textarea[id]";
const STATUS_READY = /^(NEW CAST|EDITING|DATA SYNCHRONIZED)/;
const STATUS_SAVED = /^DATA SYNCHRONIZED$/;

let dirty = false;
let restoring = false;
let saveTimer = 0;

initializeRecovery();

function initializeRecovery() {
  document.addEventListener("input", handleUserChange, true);
  document.addEventListener("change", handleUserChange, true);
  document.addEventListener("click", handleStructuralChange, true);
  window.addEventListener("pagehide", saveDraftImmediately);
  window.addEventListener("beforeunload", saveDraftImmediately);

  const status = document.querySelector("#save-status");

  if (status) {
    new MutationObserver(() => {
      const text = status.textContent.trim();

      if (STATUS_SAVED.test(text)) {
        clearDraft();
        dirty = false;
        return;
      }

      if (STATUS_READY.test(text)) {
        restoreDraftWhenReady();
      }
    }).observe(status, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  restoreDraftWhenReady();
}

function handleUserChange(event) {
  if (restoring || !event.target.matches("input, select, textarea")) {
    return;
  }

  dirty = true;
  scheduleDraftSave();
}

function handleStructuralChange(event) {
  if (restoring) {
    return;
  }

  if (
    event.target.closest(
      "#add-general, #add-style-skill, #add-outfit, " +
      "[data-delete-skill], [data-delete-outfit], #tsv-apply"
    )
  ) {
    dirty = true;
    window.setTimeout(scheduleDraftSave, 50);
  }
}

function scheduleDraftSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveDraftImmediately, 120);
}

function saveDraftImmediately() {
  if (!dirty || restoring) {
    return;
  }

  const snapshot = createSnapshot();

  if (!snapshot) {
    return;
  }

  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Local draft save failed:", error);
  }
}

function createSnapshot() {
  const fields = {};

  document.querySelectorAll(STATIC_SELECTOR).forEach(element => {
    if (!element.id || element.closest("#tsv-dialog")) {
      return;
    }

    fields[element.id] = readControl(element);
  });

  return {
    version: 1,
    savedAt: Date.now(),
    urlId: getPublicId(),
    fields,
    generalSkills: captureRows("#general-skills [data-skill-key]", "data-f"),
    styleSkills: captureRows("#style-skills [data-skill-key]", "data-f"),
    outfits: captureRows("#outfit-list [data-outfit-key]", "data-o")
  };
}

function captureRows(selector, attributeName) {
  return [...document.querySelectorAll(selector)].map(row => {
    const values = {};

    row.querySelectorAll(`[${attributeName}]`).forEach(control => {
      values[control.getAttribute(attributeName)] = readControl(control);
    });

    return values;
  });
}

function readControl(control) {
  if (control.type === "checkbox") {
    return control.checked;
  }

  return control.value;
}

async function restoreDraftWhenReady() {
  if (restoring) {
    return;
  }

  const status = document.querySelector("#save-status")?.textContent.trim() ?? "";

  if (!STATUS_READY.test(status)) {
    window.setTimeout(restoreDraftWhenReady, 250);
    return;
  }

  const raw = localStorage.getItem(getStorageKey());

  if (!raw) {
    return;
  }

  let snapshot;

  try {
    snapshot = JSON.parse(raw);
  } catch {
    clearDraft();
    return;
  }

  const age = Date.now() - Number(snapshot.savedAt || 0);

  if (age > 1000 * 60 * 60 * 24 * 14) {
    clearDraft();
    return;
  }

  const time = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(snapshot.savedAt));

  const restore = window.confirm(
    `未保存の編集内容があります。\n保存時刻: ${time}\n\n復元しますか？`
  );

  if (!restore) {
    clearDraft();
    return;
  }

  restoring = true;

  try {
    restoreStaticFields(snapshot.fields || {});
    await restoreSkillRows(snapshot.generalSkills || [], "general");
    await restoreSkillRows(snapshot.styleSkills || [], "style");
    await restoreOutfitRows(snapshot.outfits || []);

    document.querySelectorAll("input, select, textarea").forEach(control => {
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    });

    dirty = true;
    setRecoveryStatus("LOCAL DRAFT RESTORED");
    saveDraftImmediately();
  } finally {
    restoring = false;
  }
}

function restoreStaticFields(fields) {
  Object.entries(fields).forEach(([id, value]) => {
    const control = document.getElementById(id);

    if (!control || control.closest("#tsv-dialog")) {
      return;
    }

    writeControl(control, value);
  });
}

async function restoreSkillRows(savedRows, kind) {
  if (!savedRows.length) {
    return;
  }

  const containerSelector = kind === "style" ? "#style-skills" : "#general-skills";
  const addButton = document.querySelector(
    kind === "style" ? "#add-style-skill" : "#add-general"
  );

  const used = new Set();

  for (const saved of savedRows) {
    let row = findMatchingRow(containerSelector, saved, used);

    if (!row && addButton) {
      addButton.click();
      await nextFrame();
      row = findUnusedRow(containerSelector, used);
    }

    if (!row) {
      continue;
    }

    used.add(row);
    restoreRow(row, saved, "data-f");
  }
}

async function restoreOutfitRows(savedRows) {
  if (!savedRows.length) {
    return;
  }

  const addButton = document.querySelector("#add-outfit");
  const rows = () => [...document.querySelectorAll("#outfit-list [data-outfit-key]")];

  while (rows().length < savedRows.length && addButton) {
    addButton.click();
    await nextFrame();
  }

  rows().slice(0, savedRows.length).forEach((row, index) => {
    restoreRow(row, savedRows[index], "data-o");
  });
}

function findMatchingRow(containerSelector, saved, used) {
  const savedName = String(saved.name ?? "");

  return [...document.querySelectorAll(`${containerSelector} [data-skill-key]`)]
    .find(row => {
      if (used.has(row)) {
        return false;
      }

      const name = row.querySelector('[data-f="name"]')?.value ?? "";
      return savedName && name === savedName;
    });
}

function findUnusedRow(containerSelector, used) {
  return [...document.querySelectorAll(`${containerSelector} [data-skill-key]`)]
    .find(row => !used.has(row));
}

function restoreRow(row, values, attributeName) {
  Object.entries(values).forEach(([field, value]) => {
    const control = row.querySelector(`[${attributeName}="${CSS.escape(field)}"]`);

    if (!control) {
      return;
    }

    writeControl(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function writeControl(control, value) {
  if (control.type === "checkbox") {
    control.checked = Boolean(value);
  } else {
    control.value = value ?? "";
  }
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function getPublicId() {
  return new URLSearchParams(location.search).get("id")?.trim() || "new";
}

function getStorageKey() {
  return `${STORAGE_PREFIX}${location.pathname}:${getPublicId()}`;
}

function clearDraft() {
  localStorage.removeItem(getStorageKey());
}

function setRecoveryStatus(text) {
  const status = document.querySelector("#save-status");

  if (status) {
    status.textContent = text;
    status.className = "saved";
  }
}
