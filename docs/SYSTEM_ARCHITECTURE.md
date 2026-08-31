# System architecture

## Purpose

N◎VA CAST ARCHIVE is a browser application for creating, editing, viewing, organizing and exporting トーキョーN◎VA cast data. The deployed application is primarily static HTML/CSS/JavaScript and uses Supabase for persistent application data.

## Top-level boundaries

| Boundary | Responsibility |
|---|---|
| HTML pages | Stable page structure, semantic regions and script/style entry points |
| `js/` | Page behavior, domain conversion, persistence access, rendering and integrations |
| `css-next/` | Application presentation, page composition and theme system |
| Supabase | Persistent cast/account/act-related data and storage-backed resources |
| External integrations | Character Sheets transfer and VTT export targets |
| `tests/`, `scripts/`, `.github/workflows/` | Regression, architecture, quality, security and visual verification |

## Page families

The application is page-oriented rather than a single-page application. Each HTML document owns its page shell and loads the JavaScript responsibilities required for that screen.

Major page families include:

- cast archive/list and account management;
- cast viewer;
- desktop cast editor (`sheet.html`);
- mobile cast editor (`sheet-mobile.html`);
- act, combo and troop management/viewing;
- import/export and transfer support pages;
- authentication and utility pages.

Navigation between these areas is normal document navigation. Do not introduce a global SPA router as an incidental feature change.

## Runtime ownership

The current runtime does **not** use the previously attempted `cast-app.js` / `sheet-app.js` composition-root migration. Page ownership is established by HTML script loading plus responsibility-specific modules.

Design rules:

1. A dynamic UI region should have one primary renderer/controller owner.
2. Prefer explicit functions, events or narrow public APIs over post-render repair modules.
3. New code should extend an existing responsibility when that responsibility already owns the data or DOM region.
4. A MutationObserver is a compatibility mechanism, not the default orchestration model. Scope it to the smallest stable root.
5. Do not infer persistent application state from presentation text, CSS classes or button labels when a state/data API exists.

See [JAVASCRIPT_ARCHITECTURE.md](JAVASCRIPT_ARCHITECTURE.md).

## Data flow

The typical application flow is:

`Supabase / imported data -> normalization/domain conversion -> page state -> renderer -> user interaction -> validation -> persistence/export`

Compatibility aliases may be accepted at import/load boundaries, but newly saved data should use the current canonical model. Database schema changes follow [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md).

## Presentation

All active screens use the CSS-next architecture. Page entry styles own page composition and `css-next/themes/index.css` is the final theme stylesheet. JavaScript may apply semantic state attributes/classes but must not become a second stylesheet system.

See [CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md) and [THEME_SYSTEM.md](THEME_SYSTEM.md).

## External transfer/export boundary

Character Sheets transfer is an integration boundary. The active user route is bookmarklet-based. A direct POST implementation is retained intentionally but is dormant and must not become reachable accidentally. VTT exporters are separate integrations and have their own runtime loaders.

See [TRANSFER_ARCHITECTURE.md](TRANSFER_ARCHITECTURE.md).

## Architecture change policy

Large runtime migrations must be introduced incrementally and proven by regression/E2E behavior before they replace an existing owner. A new architectural abstraction is not considered canonical merely because files for it exist in a branch or historical commit.

When a migration causes a user-visible regression, restoring the working ownership model takes priority over preserving the migration structure. Retried migrations must start from the current production contract, not from the abandoned intermediate state.
