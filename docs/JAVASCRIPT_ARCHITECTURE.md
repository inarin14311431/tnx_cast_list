# JavaScript architecture

## Current runtime model

The application is page-oriented. HTML documents define stable DOM regions and load responsibility-specific scripts. The codebase contains both classic scripts and ES modules; migration to modules is allowed responsibility by responsibility, but there is no requirement that every page be controlled by a single composition-root module.

The previously attempted `cast-app.js` / `sheet-app.js` composition-root runtime is not part of the current canonical implementation.

## Responsibility boundaries

JavaScript responsibilities generally fall into these groups:

1. **Page/controller code** — coordinates one page or feature area.
2. **Domain/conversion helpers** — transforms cast, skill, outfit, transfer and related data.
3. **Persistence/integration code** — Supabase access and external service boundaries.
4. **Renderer/UI code** — owns a stable DOM region and renders current state.
5. **Compatibility/import code** — accepts historical/external formats and projects them into the current model.
6. **Cross-page infrastructure** — themes, shared controls, exporters and other explicitly loaded facilities.

A file name should describe its responsibility. Avoid introducing `fix`, `patch`, `new`, or version-only names for new canonical modules.

## Page loading

HTML script declarations are valid runtime roots. Dynamic `import()` may be used for optional responsibilities when the loader is explicit and failure can be handled locally.

Do not add a JavaScript file that is neither:

- loaded by an HTML page;
- reachable from a loaded module/script;
- registered as a narrowly justified explicit runtime root; or
- registered as an intentionally dormant implementation asset.

`scripts/audit-js-reachability.mjs` enforces this contract.

## Runtime roots and dormant modules

The reachability audit has two exceptional sets:

- `explicitRuntimeRoots`: genuine runtime files injected by non-import loaders and therefore not discoverable from the ordinary static import graph;
- `explicitDormantModules`: deliberately retained implementation assets that must exist while remaining unreachable.

`js/direct-transfer-button-post.js` is currently an explicit dormant module. The audit fails if it disappears **or** if it becomes reachable accidentally.

Do not use the dormant set as a general orphan-file allowlist. A dormant entry requires an explicit product decision to retain a disabled implementation.

## DOM ownership

A dynamic DOM region must have one primary owner.

Rules:

- Do not introduce a second independent renderer for the same region.
- Prefer direct calls, custom events or a narrow public API when another responsibility must react to the owner.
- Avoid parsing visible labels/classes to reconstruct application state.
- Do not create document-wide post-render correction loops for a page-local concern.
- A module that only changes presentation after another renderer runs should be reconsidered unless it is an explicit compatibility/integration adapter.

## MutationObserver policy

MutationObserver is permitted when the observed DOM is created asynchronously by another current owner and no direct lifecycle hook is available.

Requirements:

1. Observe the smallest stable root possible, not `document` by default.
2. Restrict the mutation types to what is actually required.
3. Make handlers idempotent.
4. Do not use the observer as persistent application state.
5. Prefer replacing the observer with an explicit event/API when the owning code is being modified anyway.

For example, the active transfer router observes only page-specific cast/editor roots so that dynamically inserted transfer/export controls can be normalized without observing the whole document.

## Dependency direction

Prefer the following direction:

`page/controller -> domain/helper -> persistence/integration`

and

`page/controller -> renderer/UI`

Pure helpers should stay DOM-free where practical. Persistence modules should not depend on page presentation. External integrations should convert from canonical application data at the boundary rather than leaking target-specific shapes throughout the editor/viewer.

Local imports must resolve, and dependency cycles should not be introduced.

## Compatibility policy

Compatibility belongs at input and external-integration boundaries. Historical field names or external shapes may be accepted when necessary, but the current internal/save model should use current canonical fields.

Do not retain obsolete runtime architecture merely to support historical source structure. Compatibility means preserving supported data/behavior, not preserving every retired implementation layer.

## Public globals

A global API may be used only when a classic-script/integration boundary genuinely requires it. Keep it narrow and document its owner. Removing a mode should also remove its global runtime API when normal users must not be able to invoke that mode.

The dormant POST adapter exposes `window.TNXDirectTransfer` only if that adapter is deliberately loaded; the active bookmarklet router deletes that global and does not load the adapter.

## Testing and architecture changes

Use source-level tests/audits for hard invariants such as reachability, forbidden runtime activation and dependency rules. Use unit/E2E/visual tests for user-visible behavior.

Architectural migrations must be staged so the existing user-facing behavior remains verifiable at every step. Do not make an architecture migration the only path to an unrelated UI correction.
