/*
 * Canonical theme registry.
 *
 * Add or remove a theme here, then add or remove its CSS selector block from
 * css-next/themes. scripts/audit-theme-system.mjs keeps both sides in sync.
 */
(() => {
  const definitions = [
    { id: "nova", label: "トーキョーＮ◎ＶＡ", colorScheme: "dark" },
    { id: "moon", label: "オーサカM○●N", colorScheme: "dark" },
    { id: "star", label: "カムイST☆R", colorScheme: "dark" },
    { id: "eden", label: "ミトラスGARDEN", colorScheme: "dark" },
    { id: "vlad", label: "ヴラド・コロニー", colorScheme: "dark" },
    { id: "lutetia", label: "ヴィル・ヌーヴ・ルテチア", colorScheme: "dark" },
    { id: "buena", label: "ブエナIЯA", colorScheme: "dark" },
    { id: "canberra", label: "キャンベラAXYZ", colorScheme: "dark" },
    { id: "hongkong", label: "ホンコンHEAVEN", colorScheme: "dark" },
    { id: "fesler", label: "フェスラー公国", colorScheme: "dark" },
    { id: "intron", label: "イントロン", colorScheme: "light" },
    { id: "axleraters", label: "ニューロ！", colorScheme: "dark" },
    { id: "inagaki", label: "稲垣 光平", colorScheme: "dark" },
    { id: "astral", label: "アストラル", colorScheme: "dark" },
    { id: "orbital", label: "軌道", colorScheme: "light" },
    { id: "spectrum-neon", label: "ネオンサイン", colorScheme: "dark" },
    { id: "japanese-army", label: "日本", colorScheme: "dark" },
    { id: "statistics-bureau", label: "行政府統計局", colorScheme: "light" }
  ].map(definition => Object.freeze(definition));

  const themes = Object.freeze(definitions);
  const byId = new Map(themes.map(theme => [theme.id, theme]));
  const defaultId = "nova";

  globalThis.TNX_THEME_REGISTRY = Object.freeze({
    defaultId,
    themes,
    get(id) {
      return byId.get(id) || null;
    },
    has(id) {
      return byId.has(id);
    }
  });
})();
