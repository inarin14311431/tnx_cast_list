const SPECIALIZED_PREFIXES = new Set(["製作：", "芸術：", "操縦："]);

function skillName(row) {
  return String(row?.querySelector('[data-f="name"]')?.value || "").trim();
}

function generalRows() {
  return [...document.querySelectorAll('#general-skills tr[data-skill-key]')];
}

export function removeDuplicateSpecializedBlankRows() {
  const rows = generalRows();
  const fixedPrefixes = new Set(
    rows
      .filter(row => !row.querySelector('[data-delete-skill]'))
      .map(skillName)
      .filter(name => SPECIALIZED_PREFIXES.has(name))
  );

  let removed = 0;
  for (const row of rows) {
    if (!row.querySelector('[data-delete-skill]')) continue;
    const name = skillName(row);
    if (!fixedPrefixes.has(name)) continue;
    row.querySelector('[data-delete-skill]')?.click();
    removed++;
  }
  return removed;
}

function queueCleanup() {
  requestAnimationFrame(() => removeDuplicateSpecializedBlankRows());
}

document.addEventListener('tnx:legacy-import-base-finished', queueCleanup);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', queueCleanup, { once: true });
} else {
  queueCleanup();
}
