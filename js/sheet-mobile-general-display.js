import { STARRED_GENERAL_NAMES } from "./general-skill-catalog.js?v=1";

export function mobileGeneralDisplayName(value) {
  const name = String(value ?? "");
  return STARRED_GENERAL_NAMES.has(name) ? `★${name}` : name;
}

function applyMobileGeneralDisplayMarks(root = document) {
  for (const group of root.querySelectorAll?.('[data-skill-category="general"]') ?? []) {
    for (const label of group.querySelectorAll('.mobile-general-display-name')) {
      const raw = label.textContent?.replace(/^★/, "") ?? "";
      const displayed = mobileGeneralDisplayName(raw);
      if (label.textContent !== displayed) label.textContent = displayed;
    }
  }
}

export function initMobileGeneralDisplayMarks({ root = document } = {}) {
  const target = root.querySelector?.("#mobile-general-skills");
  if (!target || target.dataset.starDisplayReady === "1") return;
  target.dataset.starDisplayReady = "1";
  applyMobileGeneralDisplayMarks(root);
  new MutationObserver(() => applyMobileGeneralDisplayMarks(root)).observe(target, {
    childList: true,
    subtree: true
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initMobileGeneralDisplayMarks(), { once: true });
  } else {
    initMobileGeneralDisplayMarks();
  }
}
