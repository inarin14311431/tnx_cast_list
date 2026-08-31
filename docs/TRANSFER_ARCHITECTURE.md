# Character Sheets transfer architecture

## Decision

The canonical active transfer route is the **bookmarklet (BM) route**.

A direct **POST route is retained as dormant implementation** because it may be adopted later. It must not be exposed, loaded or reachable in the normal user runtime until that product decision is made explicitly.

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

## Reactivation checklist

If POST becomes the selected transfer method later:

1. Define which screens and device classes expose POST.
2. Review Character Sheets endpoint behavior and current cross-origin/browser constraints.
3. Update `direct-transfer-button.js` or replace its routing contract deliberately.
4. Remove `direct-transfer-button-post.js` from `explicitDormantModules` only when a real runtime loader exists.
5. Add/adjust E2E coverage for new registration, update and cancellation/error behavior.
6. Update visual baselines for any newly visible controls.
7. Update this document and user-facing labels/help.
8. Verify BM fallback/removal behavior explicitly rather than leaving both modes ambiguous.

## Safety and data rules

- Do not send a cast until its source bundle has loaded and converted successfully.
- Keep the target-specific payload conversion at the integration boundary.
- Validate update URLs/keys before submission.
- Require explicit confirmation for destructive/update semantics.
- Do not persist target credentials/passwords into CAST ARCHIVE data unless a separate design explicitly requires it.

## Tests and audits

The transfer contract is protected by multiple layers:

- JavaScript reachability audit: dormant adapter exists but is unreachable;
- regression tests: active BM behavior and transfer conversion contracts;
- E2E tests: supported user transfer/export behavior;
- visual regression: visible controls and layout when relevant.

A CI pass caused by skipping the transfer path is not a substitute for these contracts.
