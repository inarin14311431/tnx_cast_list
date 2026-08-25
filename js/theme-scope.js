/* Maps semantic UI regions to stable theme attributes, including dynamic UI. */
(() => {
  const scopeRules = Object.freeze([
    {
      attribute: "themeSurface",
      value: "panel",
      selector: [
        ".archive-controls", ".account-panel", ".sheet-section", ".data-panel",
        ".troops-hero", ".troops-filter", ".troop-section", ".troop-view-readonly",
        ".troop-editor", ".combo-dialog", ".auth-panel", ".backup-panel",
        ".transfer-panel", ".panel", ".basic-profile-panel", ".personal-data-panel",
        ".life-path-panel", ".sheet-image-editor", ".image-preview-panel",
        ".image-control-panel", ".sheet-combo-list-panel", ".sheet-combo-editor",
        "[class$='-panel']", "[class*='-panel ']", "fieldset", "dialog"
      ].join(",")
    },
    {
      attribute: "themeSurface",
      value: "card",
      selector: [
        ".cast-card", ".owned-cast", ".troop-card", ".combo-card",
        ".mobile-style-row", ".mobile-outfit-card", "[class$='-card']", "[class*='-card ']"
      ].join(",")
    },
    {
      attribute: "themeBadge",
      value: "1",
      selector: [
        ".status-chip", ".cast-card__style-chip", ".owned-cast__style",
        ".troop-card__visibility", ".badge"
      ].join(",")
    },
    {
      attribute: "themeControl",
      value: "1",
      selector: [
        "button", "input[type='button']", "input[type='submit']", "input[type='reset']",
        "[role='button']", ".section-toggle", "a.button", "a.app-back-link",
        "a.cast-edit-link", "a.sheet-view-link", "a.troop-primary-action",
        "a.transfer-page__back", "a.transfer-result__link", "a.showcase-header__archive",
        "a.mobile-sheet-header__back", "a.mobile-sheet-header__pc", "a.statistics-bureau-entry",
        ".auth-navigation a", ".account-actions a", ".owned-cast__links a",
        ".owned-cast__management a", ".troop-card__actions a", ".troop-sheet__actions a",
        ".troop-editor-actions a", ".cast-troop-dialog__toolbar a", ".cast-troops-panel a",
        ".sheet-section-nav a", ".mobile-cast-topbar a", ".mobile-cast-error a",
        ".mobile-sheet-actions a", ".mobile-sheet-nav a", ".mobile-transfer-actions a",
        ".error-terminal a", ".cast-error a", "[data-troop-management-link]",
        "[data-mobile-editor-route]"
      ].join(",")
    }
  ]);

  function normalize(root = document) {
    scopeRules.forEach(rule => {
      if (root instanceof Element) {
        if (root.matches(rule.selector)) root.dataset[rule.attribute] = rule.value;
        else if (root.dataset[rule.attribute] === rule.value) delete root.dataset[rule.attribute];
      }
      if (!root.querySelectorAll) return;
      root.querySelectorAll(rule.selector).forEach(node => {
        node.dataset[rule.attribute] = rule.value;
      });
    });
  }

  function bind() {
    normalize(document);
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === "attributes") {
          normalize(record.target);
          return;
        }
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) normalize(node);
        });
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "role", "type", "href"]
    });
  }

  globalThis.TNX_THEME_SCOPE = Object.freeze({ rules: scopeRules, normalize });
  bind();
})();

import("./legal-notices.js?v=1").catch(error => console.error("Failed to load legal notices", error));
