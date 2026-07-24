/* Persistent color-theme controller shared by all active pages. */
(() => {
  const STORAGE_KEY = "tnx-cast-site-theme";
  const THEMES = new Set(["nova", "moon", "star", "eden"]);
  let buttonObserver = null;
  let buttonRefreshQueued = false;

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

  function appendStylesheet(href, marker) {
    if (document.querySelector(`link[${marker}]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(marker, "1");
    document.head.append(link);
  }

  function appendScript(src, marker) {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute(marker, "1");
    document.head.append(script);
  }

  function loadLateOverrides() {
    appendStylesheet("./css/theme-runtime.css?v=2", "data-theme-runtime");
    appendStylesheet("./css/theme-polish.css?v=2", "data-theme-polish");
    appendStylesheet("./css/theme-fixes-v3.css?v=2", "data-theme-fixes-v3");
    appendStylesheet("./css/theme-fixes-v4.css?v=4", "data-theme-fixes-v4");
  }

  function normalizeOrderButtons(root = document) {
    root.querySelectorAll?.('[data-skill-move="up"],[data-outfit-move="up"]').forEach(button => {
      if (button.textContent !== "▲") button.textContent = "▲";
    });
    root.querySelectorAll?.('[data-skill-move="down"],[data-outfit-move="down"]').forEach(button => {
      if (button.textContent !== "▼") button.textContent = "▼";
    });
    root.querySelectorAll?.('.row-delete,.outfit-delete-button').forEach(button => {
      if (button.textContent.trim() !== "×") button.textContent = "×";
    });
  }

  function queueButtonNormalization() {
    if (buttonRefreshQueued) return;
    buttonRefreshQueued = true;
    queueMicrotask(() => {
      buttonRefreshQueued = false;
      normalizeOrderButtons();
    });
  }

  function observeDynamicButtons() {
    if (buttonObserver || !document.documentElement) return;
    buttonObserver = new MutationObserver(queueButtonNormalization);
    buttonObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  appendScript("./js/handle-format.js?v=2", "data-handle-format");
  applyTheme(readTheme());

  function bindSelectors() {
    loadLateOverrides();
    normalizeOrderButtons();
    observeDynamicButtons();
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
