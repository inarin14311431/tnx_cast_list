/* Persistent color-theme controller shared by all active pages. */
(() => {
  const STORAGE_KEY = "tnx-cast-site-theme";
  const THEMES = new Set(["nova", "moon", "star", "eden", "vlad", "lutetia", "buena", "canberra", "intron", "axleraters", "inagaki", "astral", "orbital", "japanese-army"]);
  const THEME_OPTIONS = [
    ["nova", "トーキョーＮ◎ＶＡ"],
    ["moon", "オーサカM○●N"],
    ["star", "カムイST☆R"],
    ["eden", "ミトラスEΔEN"],
    ["vlad", "ヴラド・コロニー"],
    ["lutetia", "ヴィル・ヌーヴ・ルテチア"],
    ["buena", "ブエナIЯIA"],
    ["canberra", "キャンベラAYYZ"],
    ["intron", "イントロン"],
    ["axleraters", "ニューロ！"],
    ["inagaki", "稲垣 光平"],
    ["astral", "アストラル"],
    ["orbital", "軌道"],
    ["japanese-army", "日本軍"]
  ];
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

  function ensureThemeOptions(select) {
    const current = select.value;
    THEME_OPTIONS.forEach(([value, label]) => {
      let option = Array.from(select.options).find(item => item.value === value);
      if (!option) {
        option = document.createElement("option");
        option.value = value;
        select.append(option);
      }
      option.textContent = label;
    });
    if (THEMES.has(current)) select.value = current;
  }

  function ensureErrorOverlay() {
    if (!document.body || document.querySelector("[data-japanese-army-overlay]")) return;
    const overlay = document.createElement("section");
    overlay.className = "japanese-army-overlay";
    overlay.setAttribute("data-japanese-army-overlay", "1");
    overlay.innerHTML = `
      <label class="japanese-army-theme-picker">
        <span>表示テーマ <small>COLOR THEME</small></span>
        <select data-theme-select aria-label="表示テーマ"></select>
      </label>
      <div class="japanese-army-error" role="alert">ERROR</div>
      <p class="japanese-army-error-code">SYSTEM ACCESS DENIED</p>`;
    document.body.append(overlay);
    const select = overlay.querySelector("[data-theme-select]");
    ensureThemeOptions(select);
  }

  function applyTheme(theme, persist = false) {
    const next = THEMES.has(theme) ? theme : "nova";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = ["intron", "orbital"].includes(next) ? "light" : "dark";
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    }
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      ensureThemeOptions(select);
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
    appendStylesheet("./css/theme-city-expansion.css?v=2", "data-theme-city-expansion");
    appendStylesheet("./css/theme-intron-light.css?v=2", "data-theme-intron-light");
    appendStylesheet("./css/theme-vlad-vampire.css?v=1", "data-theme-vlad-vampire");
    appendStylesheet("./css/theme-special-brands.css?v=2", "data-theme-special-brands");
    appendStylesheet("./css/theme-new-worlds.css?v=1", "data-theme-new-worlds");
    appendStylesheet("./css/theme-inagaki-gaudy.css?v=1", "data-theme-inagaki-gaudy");
    appendStylesheet("./css/theme-inagaki-select-fix.css?v=1", "data-theme-inagaki-select-fix");
    appendStylesheet("./css/character-image-top-align.css?v=1", "data-character-image-top-align");
    appendStylesheet("./css/mobile-auth-navigation-fix.css?v=1", "data-mobile-auth-navigation-fix");
    appendStylesheet("./css/outfit-ofc-fields.css?v=1", "data-outfit-ofc-fields");
    appendStylesheet("./css/outfit-display-rules.css?v=2", "data-outfit-display-rules");
  }

  function loadPageEnhancements(){
    if(document.querySelector("#skills-container"))appendScript("./js/cast-style-skill-separators.js?v=1","data-cast-style-skill-separators-script");
    if(document.querySelector(".sheet-layout")){
      appendScript("./js/sheet-open-at-top.js?v=1","data-sheet-open-at-top");
      appendModuleScript("./js/outfit-ofc-fields.js?v=2","data-outfit-ofc-fields-script");
      appendModuleScript("./js/outfit-ofc-tsv-category-fix.js?v=1","data-outfit-ofc-tsv-category-fix-script");
      appendScript("./js/outfit-display-rules-v5.js?v=6","data-outfit-display-rules-script");
      appendScript("./js/sheet-import-style-skill-compat.js?v=1","data-sheet-import-style-skill-compat-script");
      appendScript("./js/sheet-import-outfit-compat.js?v=5","data-sheet-import-outfit-compat-script");
      appendModuleScript("./js/sheet-master-autofill.js?v=8","data-sheet-master-autofill-script");
    }
    if(document.querySelector("#outfit-container")){
      appendModuleScript("./js/cast-outfit-ofc-details.js?v=1","data-cast-outfit-ofc-details-script");
      appendScript("./js/outfit-display-rules-v5.js?v=6","data-outfit-display-rules-script");
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
    ensureErrorOverlay();
    loadPageEnhancements();
    normalizeOrderButtons();
    observeDynamicButtons();
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      ensureThemeOptions(select);
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