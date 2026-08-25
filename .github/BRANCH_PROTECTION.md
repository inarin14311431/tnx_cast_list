# Main branch protection policy

The production `main` branch should be protected in GitHub repository settings with the following policy.

## Required pull-request controls

- Require a pull request before merging.
- Require the branch to be up to date before merging.
- Block force pushes.
- Block branch deletion.

## Required status checks

Require these checks before `main` can be updated:

- `Regression checks / verify`
- `Security audit / Security audit`
- `Playwright E2E / Public and smoke E2E`
- `Playwright E2E / Authenticated editor E2E`
- `Playwright E2E / Mobile E2E`
- `Quality gates / Verification contract parity`
- `Quality gates / Accessibility baseline`
- `Quality gates / Performance budget`
- `Visual Regression / Compare reference screenshots`

The verification repository is the approved source for `quality-gates.json` and visual reference snapshots. Production CI rejects a quality-contract version mismatch.

Repository-side workflow files and audits enforce the checks themselves. GitHub branch protection/ruleset settings must additionally make the checks mandatory at the repository level.
