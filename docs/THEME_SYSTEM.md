# Theme system

## Source of truth

- `js/theme-registry.js` owns theme IDs, labels, order, and light/dark color scheme.
- `css-next/themes/index.css` is the final theme stylesheet manifest.
- `css-next/themes/*.css` owns every selector that names a concrete `data-theme` value.
- `js/theme-scope.js` maps existing and dynamically inserted UI to semantic theme scopes.
- `js/css-next-theme.js` only selects, persists, and applies a registered theme.

Every active CSS-next page loads the registry, controller, and scope scripts in that order. It then loads one application/page CSS entry and `css-next/themes/index.css` as the final stylesheet. Individual theme stylesheets must not be linked from HTML. The page-entry and cascade-layer contract is documented in `docs/CSS_ARCHITECTURE.md`.

## Application scopes

| Attribute | Applies to | Owned by |
|---|---|---|
| `data-theme-surface="panel"` | Sections, panels, fieldsets, dialogs | `js/theme-scope.js` |
| `data-theme-surface="card"` | Cast, troop, combo, mobile and other card components | `js/theme-scope.js` |
| `data-theme-badge="1"` | Status, style, visibility and badge elements | `js/theme-scope.js` |
| `data-theme-control="1"` | Button-like links and dynamic actions | `js/theme-scope.js` |

Native buttons and form controls can still be styled directly. Page CSS should consume semantic tokens such as `--color-surface`, `--color-text`, and `--color-accent`; it should not add a concrete theme selector.

## Add a theme

1. Add one entry to `js/theme-registry.js`.
2. Add one primary `:root[data-theme="..."]` token definition under `css-next/themes`.
3. Add presentation rules to the same theme file when the theme has special effects.
4. Add a single import to `css-next/themes/index.css` when a new file is created.
5. Run `npm run audit:themes` and `npm run verify`.

No HTML or theme-picker option markup needs to change. Select options are generated from the registry.

## Remove a theme

1. Remove its registry entry.
2. Remove its primary token block and presentation selectors, or delete its dedicated file and manifest import.
3. Run `npm run audit:themes` and `npm run verify`.

A removed theme left in browser storage automatically falls back to the registered default theme.

## Guardrails

`scripts/audit-theme-system.mjs` rejects duplicate registry IDs, missing token definitions, unregistered CSS selectors, theme identity selectors outside `css-next/themes`, orphan stylesheet imports, per-page theme links, incorrect load order, and missing semantic scope coverage.
