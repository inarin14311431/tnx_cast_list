/* Shared theme controller. Theme metadata lives only in theme-registry.js. */
(() => {
  const registry = globalThis.TNX_THEME_REGISTRY;
  if (!registry) {
    console.error("Theme registry was not loaded before css-next-theme.js.");
    return;
  }

  const STORAGE_KEY = "tnx-cast-site-theme";

  function isIndexPage() {
    return document.body?.dataset.page === "index.html";
  }

  function readTheme() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return registry.has(stored) ? stored : registry.defaultId;
    } catch {
      return registry.defaultId;
    }
  }

  function populateThemeOptions(select) {
    const current = select.value;
    const fragment = document.createDocumentFragment();
    registry.themes.forEach(theme => {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.label;
      fragment.append(option);
    });
    select.replaceChildren(fragment);
    if (registry.has(current)) select.value = current;
  }

  function synchronizeThemeSelects(themeId) {
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      populateThemeOptions(select);
      select.value = themeId;
    });
  }

  function applyTheme(themeId, { persist = false } = {}) {
    const theme = registry.get(themeId) || registry.get(registry.defaultId);
    document.documentElement.dataset.theme = theme.id;
    document.documentElement.style.colorScheme = theme.colorScheme;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme.id);
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    }
    synchronizeThemeSelects(theme.id);
    document.dispatchEvent(new CustomEvent("tnx:theme-change", { detail: { theme: theme.id } }));
    return theme.id;
  }

  function ensureJapaneseArmyOverlay() {
    if (!document.body || document.querySelector("[data-japanese-army-overlay]")) return;
    const overlay = document.createElement("section");
    overlay.className = "japanese-army-overlay";
    overlay.dataset.japaneseArmyOverlay = "1";
    const picker = isIndexPage()
      ? `<label class="japanese-army-theme-picker"><span>表示テーマ <small>COLOR THEME</small></span><select data-theme-select aria-label="表示テーマ"></select></label>`
      : "";
    overlay.innerHTML = `${picker}<div class="japanese-army-warning" role="alert"><p class="japanese-army-seal">日本国電脳鎖国結界</p><div class="japanese-army-error">不法接続</div><p class="japanese-army-declaration">国外網からの未承認アクセスを検知</p><p class="japanese-army-order">本接続は国家防衛規定に基づき強制遮断された。<br>直ちに回線を切断せよ。再接続を厳禁する。</p></div><p class="japanese-army-error-code">NATIONAL BORDER FIREWALL // ACCESS VIOLATION RECORDED</p>`;
    document.body.append(overlay);
  }

  function bindThemeSelect(select) {
    if (!isIndexPage()) {
      select.closest(".global-theme-picker, .japanese-army-theme-picker")?.remove();
      return;
    }
    populateThemeOptions(select);
    select.value = document.documentElement.dataset.theme || registry.defaultId;
    if (select.dataset.themeBound === "1") return;
    select.dataset.themeBound = "1";
    select.addEventListener("change", () => applyTheme(select.value, { persist: true }));
  }

  function bind() {
    document.documentElement.dataset.cssSystem = "next";
    const override = document.body?.dataset.themeOverride;
    if (registry.has(override)) applyTheme(override);
    ensureJapaneseArmyOverlay();
    document.querySelectorAll("[data-theme-select]").forEach(bindThemeSelect);
  }

  globalThis.TNX_THEME = Object.freeze({
    apply: applyTheme,
    current() {
      return document.documentElement.dataset.theme || registry.defaultId;
    },
    populate: populateThemeOptions
  });

  applyTheme(readTheme());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
