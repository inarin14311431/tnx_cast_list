(() => {
  // Storage ids are intentionally kept for backwards compatibility with already
  // published showcase_data. Labels and presentation are ACT SHOWCASE specific.
  const definitions = Object.freeze({
    nova: Object.freeze({ id: "nova", label: "ネオン・グリッド", code: "NEON GRID", colorScheme: "dark" }),
    intron: Object.freeze({ id: "intron", label: "モノクローム・ドシエ", code: "DOSSIER", colorScheme: "light" }),
    vlad: Object.freeze({ id: "vlad", label: "クリムゾン・ノワール", code: "CRIMSON NOIR", colorScheme: "dark" }),
    lutetia: Object.freeze({ id: "lutetia", label: "オービタル・グラス", code: "ORBITAL GLASS", colorScheme: "dark" })
  });
  const defaultId = "nova";
  const params = new URLSearchParams(location.search);
  const requested = String(params.get("theme") || "").trim().toLowerCase();
  const explicitQuery = Object.prototype.hasOwnProperty.call(definitions, requested);

  function normalize(value) {
    const id = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(definitions, id) ? id : defaultId;
  }

  function apply(value, source = "runtime") {
    const id = normalize(value);
    const theme = definitions[id];
    document.documentElement.dataset.showcaseTheme = id;
    document.documentElement.style.colorScheme = theme.colorScheme;
    document.dispatchEvent(new CustomEvent("tnx:showcase-theme-change", {
      detail: { theme: id, source }
    }));
    return id;
  }

  function applySaved(value) {
    if (explicitQuery) return apply(requested, "query");
    return apply(value, "showcase-data");
  }

  globalThis.TNX_SHOWCASE_THEME = Object.freeze({
    defaultId,
    themes: definitions,
    normalize,
    apply,
    applySaved,
    hasExplicitQuery: explicitQuery,
    current() {
      return normalize(document.documentElement.dataset.showcaseTheme);
    }
  });

  apply(explicitQuery ? requested : defaultId, explicitQuery ? "query" : "default");
})();