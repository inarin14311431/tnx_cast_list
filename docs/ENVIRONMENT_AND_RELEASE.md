# Environment and release policy

## Repositories

- Production: `inarin14311431/tnx_cast_list`
- Verification: `inarin14311431/tnx-cast-archive-test`

Production `main` is the canonical source of truth for released application behavior.

The verification repository exists to validate intended changes before production promotion. It is not an independent product fork.

## Main-branch alignment

After a change is accepted and promoted, production `main` and verification `main` should contain the same application tree unless an explicitly documented infrastructure exception exists.

Do not keep verification-only application features on verification `main`. Experimental or validation-only work belongs on branches/PRs.

When exact tree equality is a goal, infrastructure that needs independent assets must use a separate branch or external artifact source rather than polluting verification `main`.

## Change flow

Preferred flow:

1. Start from the current production contract.
2. Apply the intended change to a verification branch/PR.
3. Run regression, E2E, quality, security and visual checks.
4. Resolve failures without bypassing required checks.
5. Promote the same intended application change to production.
6. Re-align verification `main` with the accepted production state when necessary.

For changes that must be represented simultaneously in both repository PRs, keep file contents identical unless the environment difference itself is the feature under test.

## No silent environment divergence

Environment-specific differences require an explicit owner and reason. Examples of acceptable differences include repository settings, Pages configuration, secrets and deployment metadata that are not part of the Git tree.

Application code should not silently branch on "production vs verification" merely to make tests pass.

## Visual regression baseline

Visual regression assets are intentionally separated from verification `main`.

Baseline source:

- repository: `inarin14311431/tnx-cast-archive-test`
- branch: `visual-regression-baseline`

The workflow checks out this branch, validates that the visual test contract exists, copies the baseline visual tests/configuration into the checked-out application under test, and then performs the screenshot comparison.

This separation preserves two independent contracts:

1. production/verification `main` can remain application-tree aligned;
2. approved screenshots and the visual test contract can remain stable until deliberately updated.

## Updating the visual baseline

Do not update `visual-regression-baseline` automatically from a PR run.

When a visual change is intentional:

1. verify the new UI in the verification environment;
2. review screenshot differences;
3. confirm the application change itself is accepted;
4. update the dedicated baseline branch deliberately;
5. rerun Visual Regression and require a real comparison pass.

A missing baseline is an error. The workflow must not silently convert missing baseline assets into a successful skipped comparison.

## Branch protection

Required checks are part of the release contract. Do not force-merge around failing required checks as a normal workflow.

If a required check is broken because its infrastructure contract is obsolete, repair the check or its data source first, then merge normally.

## Rollback policy

For a production regression:

- restore the last known working behavior first;
- preserve data compatibility where possible;
- investigate the architectural change separately;
- reintroduce the change only after tests reproduce the original failure mode.

A rollback does not make historical design documents authoritative again. Documentation must describe the restored current implementation.
