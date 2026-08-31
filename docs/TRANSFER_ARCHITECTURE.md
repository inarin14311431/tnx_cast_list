# Character Sheets transfer architecture

## Decision

The canonical active transfer route is the **bookmarklet (BM) route**.

A direct **POST route is retained as dormant implementation** because it may be adopted later. It must not be exposed, loaded or reachable in the normal user runtime until both the product decision and the external-integration approval condition are resolved explicitly.

## Why POST is separated

POST is separated from the active runtime primarily because explicit approval from the operator of the destination Character Sheets site has not been obtained.

The POST flow sends the same kind of cast data that a user would submit through ordinary operations on the destination site, but CAST ARCHIVE would automate that submission. Even though the payload and target behavior are intended to match normal user operations, confirmation was requested before exposing the integration to ordinary users. No response has been received.

Silence must not be treated as approval. Until the destination-site operator explicitly approves the integration, or a later documented policy decision replaces this requirement, POST remains dormant.

This is an operational/integration boundary, not evidence that the POST implementation is technically invalid.

## Active BM route

`js/direct-transfer-button.js` is the active transfer router.

Its current responsibilities include:

- setting `data-transfer-mode="bookmarklet"`;
- removing inactive desktop direct-POST triggers;
- keeping the supported mobile bookmarklet trigger usable for saved casts;
- normalizing the desktop export-control order;
- loading `transfer-tsv-export.js` for the active export/bookmarklet facilities;
- removing `window.TNXDirectTransfer` from the active runtime;
- observing only relevant cast/editor roots for asynchronously inserted controls.

The active router must not import or execute `direct-transfer-button-post.js`.

## Dormant POST route

The retained implementation consists of two layers.

### UI adapter

`js/direct-transfer-button-post.js`

When deliberately loaded, it can:

- bind direct-transfer triggers;
- open `transfer.html?embed=1&id=...` in a dialog for desktop;
- route the mobile bookmarklet-style trigger to `mobile-transfer.html`;
- expose the narrow `window.TNXDirectTransfer` API.

This file is intentionally dormant and is registered in `scripts/audit-js-reachability.mjs` as an `explicitDormantModules` entry.

### POST transfer page

`transfer.html` + `js/transfer.js`

The transfer page remains implemented. It loads CAST ARCHIVE data, builds the Character Sheets payload, supports new-registration/update input, validates the target, presents a preview/confirmation step and submits to the Character Sheets endpoint by POST.

Keeping this page implemented does **not** make POST the active application route. Activation is controlled by whether the dormant UI adapter is wired into the runtime.

## Activation boundary

POST mode is considered activated only when the normal cast/editor runtime intentionally loads or calls the POST adapter.

Do not activate POST mode by:

- merely retaining `transfer.html` or `transfer.js`;
- adding a hidden button that ordinary users can still discover/trigger;
- adding an import/string-loader edge accidentally;
- removing the module from the dormant audit without a corresponding product/UX change.

Technical readiness alone is not sufficient for activation. External approval or an explicitly documented replacement policy is also required.

## Reactivation checklist

If POST becomes the selected transfer method later:

1. Confirm and document approval from the destination Character Sheets site operator, or document the later policy decision that explicitly replaces that condition.
2. Define which screens and device classes expose POST.
3. Review Character Sheets endpoint behavior and current cross-origin/browser constraints.
4. Update `direct-transfer-button.js` or replace its routing contract deliberately.
5. Remove `direct-transfer-button-post.js` from `explicitDormantModules` only when a real runtime loader exists.
6. Add/adjust E2E coverage for new registration, update and cancellation/error behavior.
7. Update visual baselines for any newly visible controls.
8. Update this document, `DECISION_HISTORY.md`, and user-facing labels/help.
9. Verify BM fallback/removal behavior explicitly rather than leaving both modes ambiguous.

## Safety and data rules

- Do not send a cast until its source bundle has loaded and converted successfully.
- Keep the target-specific payload conversion at the integration boundary.
- Validate update URLs/keys before submission.
- Require explicit confirmation for destructive/update semantics.
- Do not persist target credentials/passwords into CAST ARCHIVE data unless a separate design explicitly requires it.
- Do not infer permission to automate an external service from technical compatibility alone.

## Tests and audits

The transfer contract is protected by multiple layers:

- JavaScript reachability audit: dormant adapter exists but is unreachable;
- regression tests: active BM behavior and transfer conversion contracts;
- E2E tests: supported user transfer/export behavior;
- visual regression: visible controls and layout when relevant.

A CI pass caused by skipping the transfer path is not a substitute for these contracts.
