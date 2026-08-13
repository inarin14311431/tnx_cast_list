/* Shared theme controller. Applies the theme on every screen; theme selection UI exists only on index.html. */
(() => {
  const STORAGE_KEY = "tnx-cast-site-theme";
  const THEMES = new Set([
    "nova", "moon", "star", "eden", "vlad", "lutetia", "buena",
    "canberra", "hongkong", "fesler", "intron", "axleraters", "inagaki",
    "astral", "orbital", "japanese-army"
  ]);
  const THEME_OPTIONS = [
    ["nova", "トーキョーＮ◎ＶＡ"], ["moon", "オーサカM○●N"], ["star", "カムイST☆R"],
    ["eden", "ミトラスGARDEN"], ["vlad", "ヴラド・コロニー"], ["lutetia", "ヴィル・ヌーヴ・ルテチア"],
    ["buena", "ブエナIЯA"], ["canberra", "キャンベラAXYZ"], ["hongkong", "ホンコンHEAVEN"],
    ["fesler", "フェスラー公国"], ["intron", "イントロン"], ["axleraters", "ニューロ！"],
    ["inagaki", "稲垣 光平"], ["astral", "アストラル"], ["orbital", "軌道"], ["japanese-army", "日本"]
  ];

  function isIndexPage() {
    return document.body?.dataset.page === "index.html";
  }

  function ensureThemeOptions(select) {
    const current = select.value;
    THEME_OPTIONS.forEach(([value, label]) => {
      let option = Array.from(select.options).find(item => item.value === value);
      if (!option) { option = document.createElement("option"); option.value = value; select.append(option); }
      option.textContent = label;
    });
    if (THEMES.has(current)) select.value = current;
  }

  function readTheme() {
    try { const stored = localStorage.getItem(STORAGE_KEY); return THEMES.has(stored) ? stored : "nova"; }
    catch { return "nova"; }
  }

  function ensureJapaneseArmyOverlay() {
    if (!document.body || document.querySelector("[data-japanese-army-overlay]")) return;
    const overlay = document.createElement("section");
    overlay.className = "japanese-army-overlay";
    overlay.setAttribute("data-japanese-army-overlay", "1");
    const picker = isIndexPage()
      ? `<label class="japanese-army-theme-picker"><span>表示テーマ <small>COLOR THEME</small></span><select data-theme-select aria-label="表示テーマ"></select></label>`
      : "";
    overlay.innerHTML = `${picker}<div class="japanese-army-warning" role="alert"><p class="japanese-army-seal">日本国電脳鎖国結界</p><div class="japanese-army-error">不法接続</div><p class="japanese-army-declaration">国外網からの未承認アクセスを検知</p><p class="japanese-army-order">本接続は国家防衛規定に基づき強制遮断された。<br>直ちに回線を切断せよ。再接続を厳禁する。</p></div><p class="japanese-army-error-code">NATIONAL BORDER FIREWALL // ACCESS VIOLATION RECORDED</p>`;
    document.body.append(overlay);
    const select = overlay.querySelector("[data-theme-select]");
    if (select) ensureThemeOptions(select);
  }

  function applyTheme(theme, persist = false) {
    const next = THEMES.has(theme) ? theme : "nova";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = ["intron", "orbital"].includes(next) ? "light" : "dark";
    if (persist) { try { localStorage.setItem(STORAGE_KEY, next); } catch {} }
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      ensureThemeOptions(select);
      if (select.value !== next) select.value = next;
    });
  }

  applyTheme(readTheme());
  const bind = () => {
    document.documentElement.dataset.cssSystem = "next";
    ensureJapaneseArmyOverlay();
    document.querySelectorAll("[data-theme-select]").forEach(select => {
      if (!isIndexPage()) {
        select.closest(".global-theme-picker, .japanese-army-theme-picker")?.remove();
        return;
      }
      ensureThemeOptions(select);
      if (select.dataset.themeBound === "1") return;
      select.dataset.themeBound = "1";
      select.value = document.documentElement.dataset.theme || "nova";
      select.addEventListener("change", () => applyTheme(select.value, true));
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();