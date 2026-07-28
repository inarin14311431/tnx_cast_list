/* Persistent color-theme controller shared by all active pages. */
(() => {
  const STORAGE_KEY = "tnx-cast-site-theme";
  const THEMES = new Set(["nova", "moon", "star", "eden", "vlad", "lutetia", "buena", "canberra", "intron", "axleraters", "inagaki"]);
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
    document.documentElement.style.colorScheme = next === "intron" ? "light" : "dark";
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

  function appendModuleScript(src, marker) {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    script.setAttribute(marker, "1");
    document.head.append(script);
  }

  function loadLateOverrides() {
    appendStylesheet("./css/theme-runtime.css?v=2", "data-theme-runtime");
    appendStylesheet("./css/theme-polish.css?v=2", "data-theme-polish");
    appendStylesheet("./css/theme-fixes-v3.css?v=2", "data-theme-fixes-v3");
    appendStylesheet("./css/theme-fixes-v4.css?v=4", "data-theme-fixes-v4");
    appendStylesheet("./css/style-skill-separators.css?v=1", "data-style-skill-separators");
    appendStylesheet("./css/theme-city-expansion.css?v=2", "data-theme-city-expansion");
    appendStylesheet("./css/theme-intron-light.css?v=2", "data-theme-intron-light");
    appendStylesheet("./css/theme-vlad-vampire.css?v=1", "data-theme-vlad-vampire");
    appendStylesheet("./css/theme-special-brands.css?v=2", "data-theme-special-brands");
    appendStylesheet("./css/theme-inagaki-gaudy.css?v=1", "data-theme-inagaki-gaudy");
    appendStylesheet("./css/theme-inagaki-select-fix.css?v=1", "data-theme-inagaki-select-fix");
    appendStylesheet("./css/character-image-top-align.css?v=1", "data-character-image-top-align");
    appendStylesheet("./css/mobile-auth-navigation-fix.css?v=1", "data-mobile-auth-navigation-fix");
    appendStylesheet("./css/outfit-ofc-fields.css?v=1", "data-outfit-ofc-fields");
    appendStylesheet("./css/outfit-display-rules-v5.css?v=5", "data-outfit-display-rules-v5");
  }

  function loadPageEnhancements(){
    if(document.querySelector("#style-skills"))appendScript("./js/style-skill-separators.js?v=1","data-style-skill-separators-script");
    if(document.querySelector("#skills-container"))appendScript("./js/cast-style-skill-separators.js?v=1","data-cast-style-skill-separators-script");
    if(document.querySelector(".sheet-layout")){
      appendScript("./js/sheet-open-at-top.js?v=1","data-sheet-open-at-top");
      appendModuleScript("./js/outfit-ofc-fields.js?v=1","data-outfit-ofc-fields-script");
      appendModuleScript("./js/outfit-ofc-extra-columns.js?v=2","data-outfit-ofc-extra-columns-script");
      appendModuleScript("./js/outfit-ofc-tsv-category-fix.js?v=1","data-outfit-ofc-tsv-category-fix-script");
      appendScript("./js/outfit-display-rules-v5.js?v=2","data-outfit-display-rules-v5-script");
      appendScript("./js/outfit-text-limits.js?v=2","data-outfit-text-limits-script");
    }
    if(document.querySelector("#outfit-container")){
      appendModuleScript("./js/cast-outfit-ofc-details.js?v=1","data-cast-outfit-ofc-details-script");
      appendScript("./js/outfit-display-rules-v5.js?v=2","data-outfit-display-rules-v5-script");
    }
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
    loadPageEnhancements();
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