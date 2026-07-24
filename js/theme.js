/* Persistent color-theme controller shared by all active pages. */
(() => {
  const STORAGE_KEY = "tnx-cast-site-theme";
  const THEMES = new Set(["nova", "moon", "star", "eden"]);

  function readTheme() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return THEMES.has(stored) ? stored : "nova";
    } catch {
      return "nova";
    }
  }

  function applyTheme(theme, persist = false) {
    const next = THEMES.has(theme) ? theme : "nova";
    document.documentElement.dataset.theme = next;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    }
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      if (select.value !== next) select.value = next;
    });
    window.dispatchEvent(new CustomEvent("tnx:theme-change", { detail: { theme: next } }));
  }

  applyTheme(readTheme());

  function bindSelectors() {
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      if (select.dataset.themeBound === "1") return;
      select.dataset.themeBound = "1";
      select.value = document.documentElement.dataset.theme || "nova";
      select.addEventListener("change", () => applyTheme(select.value, true));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSelectors, { once: true });
  } else {
    bindSelectors();
  }

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) applyTheme(readTheme());
  });

  window.TNXTheme = { apply: theme => applyTheme(theme, true), current: () => document.documentElement.dataset.theme || "nova" };
})();
