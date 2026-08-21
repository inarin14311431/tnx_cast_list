const SPECIALIZED_PREFIXES = ["製作：", "芸術：", "操縦："];

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
let replayingImportClick = false;

function skillName(row) {
  return String(row?.querySelector('[data-f="name"]')?.value || "").trim();
}

function generalRows() {
  return [...document.querySelectorAll('#general-skills tr[data-skill-key]')];
}

function fixedSpecializedRow(prefix) {
  return generalRows().find(row => {
    const name = skillName(row);
    return !row.querySelector('[data-delete-skill]') && (name === prefix || name.startsWith(prefix));
  }) || null;
}

async function setField(row, field, value) {
  const input = row?.querySelector(`[data-f="${field}"]`);
  if (!input) return;
  if (input.type === "checkbox") input.checked = Boolean(value);
  else input.value = String(value ?? "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await waitFrame();
}

export async function resetFixedSpecializedRows() {
  for (const prefix of SPECIALIZED_PREFIXES) {
    const row = fixedSpecializedRow(prefix);
    if (!row) continue;
    await setField(row, "name", prefix);
    await setField(row, "skill_kind", "proper");
    await setField(row, "level", 0);
    for (const suit of ["reason", "passion", "life", "mundane"]) await setField(row, suit, false);
    await setField(row, "free_level", 0);
    await setField(row, "description", "");
  }
}

export function removeDuplicateSpecializedBlankRows() {
  const rows = generalRows();
  const fixedPrefixes = new Set(
    rows
      .filter(row => !row.querySelector('[data-delete-skill]'))
      .map(skillName)
      .filter(name => SPECIALIZED_PREFIXES.includes(name))
  );

  let removed = 0;
  for (const row of rows) {
    const del = row.querySelector('[data-delete-skill]');
    if (!del) continue;
    const name = skillName(row);
    if (!fixedPrefixes.has(name)) continue;
    del.click();
    removed++;
  }
  return removed;
}

function queueCleanup() {
  requestAnimationFrame(() => removeDuplicateSpecializedBlankRows());
}

function bindImportReset() {
  const apply = document.querySelector('#legacy-import-apply');
  if (!apply || apply.dataset.specializedResetBound === "1") return;
  apply.dataset.specializedResetBound = "1";
  apply.addEventListener("click", async event => {
    if (replayingImportClick || apply.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    await resetFixedSpecializedRows();
    replayingImportClick = true;
    try {
      apply.click();
    } finally {
      replayingImportClick = false;
    }
  }, true);
}

function initialize() {
  bindImportReset();
  queueCleanup();
}

document.addEventListener('tnx:legacy-import-base-finished', queueCleanup);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
