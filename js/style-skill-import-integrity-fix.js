/* Repair structured style-skill details and remove duplicate legacy-import rows. */
(() => {
  const PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
  const DETAIL_KEYS = ["skill", "limit", "timing", "target", "range", "difficulty", "confrontation", "description", "page"];
  let repairing = false;

  function balancedJson(text, start) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) return text.slice(start, index + 1);
      }
    }
    return "";
  }

  function decodeDetail(value) {
    const source = String(value || "").replaceAll("¥", "\\");
    const candidates = [];
    let offset = 0;
    while ((offset = source.indexOf(PREFIX, offset)) >= 0) {
      const objectStart = source.indexOf("{", offset + PREFIX.length);
      if (objectStart >= 0) {
        const json = balancedJson(source, objectStart);
        if (json) {
          try { candidates.push(JSON.parse(json)); } catch {}
        }
      }
      offset += PREFIX.length;
    }
    if (!candidates.length) return null;

    let detail = candidates[candidates.length - 1];
    for (let guard = 0; guard < 5; guard += 1) {
      const nested = decodeDetail(detail?.description);
      if (!nested) break;
      detail = { ...detail, ...nested };
    }
    return detail;
  }

  function canonical(detail) {
    const clean = Object.fromEntries(DETAIL_KEYS.map(key => [key, String(detail?.[key] ?? "")]));
    return `${PREFIX}\n${JSON.stringify(clean)}`;
  }

  function repairRow(row) {
    if (!row || row.dataset.styleIntegrityRepairing === "1") return;
    const original = row.querySelector('[data-f="description"]');
    const visible = row.querySelector('[data-style-field="description"]');
    const detail = decodeDetail(visible?.value) || decodeDetail(original?.value);
    if (!detail) return;

    row.dataset.styleIntegrityRepairing = "1";
    try {
      for (const key of DETAIL_KEYS) {
        const control = row.querySelector(`[data-style-field="${key}"]`);
        if (!control) continue;
        const value = String(detail[key] ?? "");
        if (control.value !== value) control.value = value;
      }
      if (original) {
        const encoded = canonical(detail);
        if (original.value !== encoded) {
          original.value = encoded;
          original.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } finally {
      delete row.dataset.styleIntegrityRepairing;
    }
  }

  function normalizeName(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .replace(/^[★†※＠@■┗]+\s*/, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function mergeRow(target, duplicate) {
    const targetLevel = target.querySelector('[data-f="level"]');
    const duplicateLevel = duplicate.querySelector('[data-f="level"]');
    const mergedLevel = Math.max(Number(targetLevel?.value || 0), Number(duplicateLevel?.value || 0));
    if (targetLevel && Number(targetLevel.value || 0) !== mergedLevel) {
      targetLevel.value = String(mergedLevel);
      targetLevel.dispatchEvent(new Event("input", { bubbles: true }));
    }
    for (const suit of ["reason", "passion", "life", "mundane"]) {
      const keep = target.querySelector(`[data-f="${suit}"]`);
      const extra = duplicate.querySelector(`[data-f="${suit}"]`);
      if (keep && extra?.checked && !keep.checked) {
        keep.checked = true;
        keep.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  function dedupeImportedRows() {
    if (repairing) return;
    repairing = true;
    try {
      const seen = new Map();
      for (const row of document.querySelectorAll('#style-skills tr[data-skill-key]')) {
        const name = normalizeName(row.querySelector('[data-f="name"]')?.value);
        if (!name) continue;
        const first = seen.get(name);
        if (!first) {
          seen.set(name, row);
          continue;
        }
        mergeRow(first, row);
        row.querySelector('[data-delete-skill]')?.click();
      }
    } finally {
      repairing = false;
    }
  }

  function scan() {
    document.querySelectorAll('#style-skills tr[data-skill-key]').forEach(repairRow);
  }

  function initialize() {
    const root = document.querySelector("#style-skills");
    if (!root) { setTimeout(initialize, 100); return; }
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    };
    new MutationObserver(queue).observe(root, { childList: true, subtree: true, characterData: true });
    root.addEventListener("input", queue, true);
    queue();

    const message = document.querySelector("#legacy-import-message");
    if (message) {
      new MutationObserver(() => {
        if (!message.textContent.includes("反映しました")) return;
        setTimeout(dedupeImportedRows, 150);
        setTimeout(dedupeImportedRows, 600);
        setTimeout(dedupeImportedRows, 1200);
      }).observe(message, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();