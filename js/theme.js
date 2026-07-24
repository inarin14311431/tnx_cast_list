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
    document.documentElement.style.colorScheme = next === "moon" || next === "eden" ? "light" : "dark";
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    }
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      if (select.value !== next) select.value = next;
    });
    window.dispatchEvent(new CustomEvent("tnx:theme-change", { detail: { theme: next } }));
  }

  function loadLateOverrides() {
    if (document.querySelector('link[data-theme-runtime]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./css/theme-runtime.css?v=2";
    link.dataset.themeRuntime = "1";
    document.head.append(link);
  }

  applyTheme(readTheme());

  function bindSelectors() {
    loadLateOverrides();
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