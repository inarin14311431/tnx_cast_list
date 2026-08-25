/* Keep structured style-skill detail payloads canonical during normal editing.
 * Legacy import reconciliation belongs to sheet-import-style-skill-compat.js.
 */
(() => {
  import("./skill-display-enhancements.js?v=1");
  const PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
  const STYLE_SKILLS_CHANGED_EVENT = "tnx:style-skills-changed";
  const INTERNAL_NORMALIZATION_EVENT = "tnxInternalNormalization";
  const DETAIL_KEYS = ["skill", "limit", "timing", "target", "range", "difficulty", "confrontation", "description", "page"];

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

  function detailCandidates(value) {
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
    return candidates;
  }

  function decodeDetail(value) {
    const candidates = detailCandidates(value);
    if (!candidates.length) return null;
    let detail = candidates[candidates.length - 1];
    for (let guard = 0; guard < 8; guard += 1) {
      const nested = detailCandidates(detail?.description);
      if (!nested.length) break;
      detail = { ...detail, ...nested[nested.length - 1] };
    }
    return detail;
  }

  function cleanDescription(value) {
    let text = String(value ?? "");
    for (let guard = 0; guard < 8 && text.includes(PREFIX); guard += 1) {
      const nested = decodeDetail(text);
      if (!nested) break;
      text = String(nested.description ?? "");
    }
    if (!text.includes(PREFIX)) return text;
    return text.slice(0, text.indexOf(PREFIX)).trim();
  }

  function sanitizeDetail(detail) {
    const clean = Object.fromEntries(DETAIL_KEYS.map(key => [key, String(detail?.[key] ?? "")]));
    clean.description = cleanDescription(clean.description);
    return clean;
  }

  function canonical(detail) {
    return `${PREFIX}\n${JSON.stringify(sanitizeDetail(detail))}`;
  }

  function currentVisibleDetail(row) {
    return Object.fromEntries(DETAIL_KEYS.map(key => {
      const control = row.querySelector(`[data-style-field="${key}"]`);
      return [key, String(control?.value ?? "")];
    }));
  }

  function dispatchInternalNormalization(input) {
    input.dispatchEvent(new CustomEvent("input", {
      bubbles: true,
      detail: { [INTERNAL_NORMALIZATION_EVENT]: true }
    }));
  }

  function repairRow(row) {
    if (!row || row.dataset.styleIntegrityRepairing === "1") return;
    const original = row.querySelector('[data-f="description"]');
    const visible = row.querySelector('[data-style-field="description"]');
    const decoded = decodeDetail(visible?.value) || decodeDetail(original?.value);
    if (!decoded && !String(visible?.value || "").includes(PREFIX)) return;

    const detail = sanitizeDetail(decoded || currentVisibleDetail(row));
    row.dataset.styleIntegrityRepairing = "1";
    try {
      for (const key of DETAIL_KEYS) {
        const control = row.querySelector(`[data-style-field="${key}"]`);
        if (!control) continue;
        const value = key === "description" ? cleanDescription(detail[key]) : String(detail[key] ?? "");
        if (control.value !== value) control.value = value;
      }
      if (original) {
        const encoded = canonical(detail);
        if (original.value !== encoded) {
          original.value = encoded;
          // This is a presentation-time compatibility repair, not a user edit.
          // Keep the event available to presentation modules while allowing the
          // sheet editor to exclude it from dirty/model synchronization.
          dispatchInternalNormalization(original);
        }
      }
    } finally {
      delete row.dataset.styleIntegrityRepairing;
    }
  }

  function scan() {
    document.querySelectorAll('#style-skills tr[data-skill-key]').forEach(repairRow);
  }

  function initializeStyleSkillDetailIntegrity() {
    const root = document.querySelector("#style-skills");
    if (!root) { setTimeout(initializeStyleSkillDetailIntegrity, 100); return; }
    if (root.dataset.styleDetailIntegrityInitialized === "1") return;
    root.dataset.styleDetailIntegrityInitialized = "1";

    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    };
    root.addEventListener(STYLE_SKILLS_CHANGED_EVENT, queue);
    queue();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeStyleSkillDetailIntegrity, { once: true });
  else initializeStyleSkillDetailIntegrity();
})();
