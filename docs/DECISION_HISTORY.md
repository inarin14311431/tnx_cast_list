# Architecture and operation decision history

This document records important design and operation decisions in chronological order so that maintainers and AI agents can understand not only the current implementation, but why it reached its current state.

It is not a commit log. Record only decisions that materially change architecture, active/dormant feature status, environment policy, release policy, CI contracts, data contracts, or other long-lived maintenance assumptions.

## Entry format

Each entry should contain:

- **Date** — decision date in `YYYY-MM-DD` format.
- **Decision** — what was decided.
- **Reason** — why the decision was made.
- **Current status** — active, dormant, superseded, reverted, or historical.
- **Impact / references** — affected documents, runtime files, PRs, branches, or CI contracts.

When a later decision changes an earlier one, do not delete the earlier entry. Add a new entry and mark the earlier decision as superseded or reverted. This preserves the reasoning chain.

---

## 2026-08-06 — Verification changes promoted to production

**Decision**

Use the verification environment to complete UI and behavior changes, then promote the validated result to production.

**Reason**

The cast editor/viewer redesign had accumulated multiple layout and behavior fixes that needed a stable validation stage before production release.

**Current status**

Historical foundation for the current promotion policy. The policy was later made stricter by declaring production `main` the canonical source of truth.

**Impact / references**

- `docs/ENVIRONMENT_AND_RELEASE.md`
- production and verification repository workflow

---

## 2026-08-31 — Production `main` declared canonical

**Decision**

Treat production `main` as the canonical source of truth and align the verification repository to it when their tracked trees diverge unintentionally.

**Reason**

Production behavior was confirmed to be stable while the verification repository contained experimental architecture and validation-only changes. Using production as the canonical baseline prevents experimental history from silently becoming specification.

**Current status**

Active.

**Impact / references**

- `docs/ENVIRONMENT_AND_RELEASE.md`
- verification alignment PR #212
- production and verification Git-tracked trees should remain equivalent unless a deliberate verification change is in progress

---

## 2026-08-31 — Composition-root runtime migration reverted

**Decision**

Do not treat the attempted `cast-app.js` / `sheet-app.js` composition-root migration as current architecture. Restore the working page/runtime loading model instead.

**Reason**

The composition-root migration introduced editor regressions. Architectural cleanup must not take precedence over verified runtime behavior.

**Current status**

Reverted. Historical only.

**Impact / references**

- historical rollback commit `51d7e26aede9a535f89d037b126a045ce244ff16`
- `docs/JAVASCRIPT_ARCHITECTURE.md` documents the current page/runtime model instead of the reverted composition-root model
- future architecture work must be revalidated from current behavior rather than assuming this migration remains partially active

---

## 2026-08-31 — Bookmarklet transfer retained as active route

**Decision**

Keep the Bookmarklet (BM) transfer flow as the active user-facing transfer route.

**Reason**

BM is the production-proven transfer path and should remain unchanged while alternative transfer approaches are evaluated.

**Current status**

Active.

**Impact / references**

- `js/direct-transfer-button.js`
- `js/transfer-tsv-export.js`
- `docs/TRANSFER_ARCHITECTURE.md`

---

## 2026-08-31 — POST transfer retained as dormant implementation pending external approval

**Decision**

Restore and retain the POST transfer implementation for possible future adoption, but do not expose, import, or execute it in the normal user runtime until the operator of the destination Character Sheets site has explicitly approved that usage.

**Reason**

The POST flow sends the same kind of data that a user would submit through ordinary operations on the destination site, but it automates submission from CAST ARCHIVE. Before exposing that integration to users, confirmation from the destination-site operator was sought as a matter of operational courtesy and integration safety. No response has been received, so approval must not be assumed from silence.

The implementation is therefore preserved to avoid discarding completed work, while remaining separated from the normal runtime until approval or another explicit policy decision is obtained.

**Current status**

Dormant; external approval pending.

**Impact / references**

- `js/direct-transfer-button-post.js`
- `transfer.html`
- `js/transfer.js`
- `scripts/audit-js-reachability.mjs`
- `docs/TRANSFER_ARCHITECTURE.md`
- dormant-module CI contract requires the adapter to exist while remaining unreachable from active runtime roots
- a future technical validation alone is not sufficient to activate POST; the external-approval condition must also be resolved explicitly

---

## 2026-08-31 — Visual Regression baseline separated from verification `main`

**Decision**

Store approved Visual Regression assets on the verification repository branch `visual-regression-baseline` instead of requiring verification `main` to contain validation-only files.

**Reason**

Production and verification `main` are intended to remain equivalent. Keeping visual-only assets on verification `main` violated that contract, while silently skipping Visual Regression when assets were missing weakened CI.

**Current status**

Active.

**Impact / references**

- branch `visual-regression-baseline`
- `.github/workflows/visual-regression.yml`
- `docs/ENVIRONMENT_AND_RELEASE.md`
- `docs/TESTING_AND_CI.md`
- missing baseline assets are a CI failure; visual comparison must not pass by being skipped

---

## 2026-09-01 — Design documentation reorganized around current implementation

**Decision**

Maintain a structured design-document set under `docs/`, with `docs/README.md` as the entry point, and describe the current verified implementation rather than abandoned migration plans.

**Reason**

A maintainer or AI agent should be able to infer the active architecture, environment policy, transfer state, and CI contracts directly from the repository without relying on conversation history.

**Current status**

Active.

**Impact / references**

- `docs/README.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/JAVASCRIPT_ARCHITECTURE.md`
- `docs/TRANSFER_ARCHITECTURE.md`
- `docs/ENVIRONMENT_AND_RELEASE.md`
- `docs/TESTING_AND_CI.md`
- this document

---

## Maintenance rule

Add an entry in the same PR whenever a change introduces or reverses a long-lived decision such as:

- changing the canonical environment or promotion flow;
- activating, deactivating, replacing, or restoring a feature route;
- adopting or reverting an architectural pattern;
- changing source-of-truth ownership;
- changing a persistent data or migration contract;
- changing required CI behavior or the meaning of a passing check;
- introducing a compatibility policy that future work must preserve;
- changing an external-integration approval, permission, or operational-safety assumption.

Minor UI fixes, refactors that do not change ownership/contracts, dependency updates, and ordinary bug fixes do not need entries unless they establish a new maintenance rule.
