# Testing and CI policy

## Goal

CI exists to prove that an intended change preserves the active application contract. Required checks must execute their real validation path; a skipped or bypassed check is not equivalent to a successful check unless the skip itself is an explicit, reviewed contract.

## Local verification

`package.json` exposes the primary local commands.

### Core verification

`npm run verify`

This runs JavaScript/static architecture checks, runtime integrity audits, CSS/theme checks, page/runtime ownership checks, security/migration/quality audits, JavaScript reachability, CI-contract checks, ownership reports and Node regression tests.

Use this before relying on browser E2E results alone.

### Node regression tests

`npm test`

Runs `node --test tests/*.test.mjs`.

These tests are appropriate for stable source/data contracts and regressions that do not require a real browser.

### Browser E2E

`npm run e2e`

Runs Playwright user-flow tests. Browser tests should cover behavior that depends on actual navigation, DOM interaction, rendering lifecycle, storage/browser APIs or integration UI.

### Visual regression

`npm run test:visual`

Runs the visual contract with `playwright.visual.config.js` when the baseline assets are present in the working tree.

Production CI uses the dedicated visual baseline branch described in [ENVIRONMENT_AND_RELEASE.md](ENVIRONMENT_AND_RELEASE.md).

## GitHub Actions workflows

The repository currently separates checks into these workflows:

| Workflow | Purpose |
|---|---|
| `regression.yml` | Static/runtime audits and Node regression tests |
| `playwright.yml` | Browser E2E behavior |
| `quality.yml` | Quality/architecture gates |
| `security.yml` | Security audit |
| `visual-regression.yml` | Screenshot comparison against approved baseline assets |

A change is ready for normal merge only when the required workflows for that PR pass.

## Test-layer ownership

Choose the narrowest layer that proves the contract.

- **Audit/static check:** architecture invariant, forbidden dependency, file/load/reachability rule.
- **Node test:** deterministic data transformation or source contract.
- **E2E:** user interaction/navigation/browser lifecycle.
- **Visual:** layout, spacing, typography, component placement and theme appearance.

Do not use screenshot assertions to prove data correctness when a Node/E2E assertion can prove it directly. Do not use source-string tests as the only proof of user-visible behavior.

## JavaScript reachability

`scripts/audit-js-reachability.mjs` builds the runtime JavaScript graph from HTML roots, imports and narrowly declared exceptional roots.

The audit has two special categories:

- explicit runtime roots: genuinely executed modules loaded outside an ordinary import edge;
- explicit dormant modules: intentionally retained but disabled modules.

A dormant module must both exist and remain unreachable. This protects retained future implementations such as the POST transfer adapter from accidental activation.

## Visual regression contract

Visual Regression must:

1. check out the application under test;
2. check out `tnx-cast-archive-test:visual-regression-baseline`;
3. fail if the baseline visual contract is missing;
4. copy the approved test/config assets into the test workspace;
5. execute screenshot comparison;
6. upload reports/diffs when available.

Do not change the workflow to report success merely because baseline assets cannot be found.

Intentional visual changes require review and deliberate baseline update after the application change is accepted.

## Regression-fix rule

When CI fails after a change:

1. identify which contract actually failed;
2. repair the implementation or the obsolete test infrastructure;
3. avoid weakening the assertion simply to obtain a green status;
4. rerun the real validation path;
5. merge without bypassing branch protection.

A test may be changed when the product contract changed intentionally, but the PR should make that contract change explicit in code and design documentation.

## Documentation as part of verification

CI does not currently guarantee semantic documentation accuracy. Review therefore must include documentation when a change affects architecture, active/dormant routes, environment policy, visual-baseline handling, migrations or theme/CSS contracts.

The document index and ownership rules are in [README.md](README.md).
