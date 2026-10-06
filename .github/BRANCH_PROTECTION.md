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
- `Playwright E2E / Act showcase E2E`(ACT SHOWCASE に関係するPRでだけ実行。関係しないPRでは skipped になり、必須チェックでは成功扱い。ワークフロー全体を `paths` で絞ると他のチェックが未完了になるため、絞りはジョブ単位)
- `Playwright E2E / Authenticated editor E2E`
- `Playwright E2E / Mobile E2E`
- `Quality gates / Verification contract parity`
- `Quality gates / Accessibility baseline`
- `Quality gates / Performance budget`
- `Visual Regression / Compare reference screenshots`

The verification repository is the approved source for `quality-gates.json` and visual reference snapshots. Production CI rejects a quality-contract version mismatch.

Repository-side workflow files and audits enforce the checks themselves. GitHub branch protection/ruleset settings must additionally make the checks mandatory at the repository level.

Because "require the branch to be up to date before merging" (`strict_required_status_checks_policy`) is enabled, `main` after a merge is always identical to what the PR already validated. So a push to `main` only re-runs `Regression checks / verify`; the other checks run on pull requests only.
