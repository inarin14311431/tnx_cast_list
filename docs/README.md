# N◎VA CAST ARCHIVE design documents

This directory documents the current production design contract. Documentation follows the implementation that is intended to become `main`; it must not describe abandoned migrations as if they were active.

## Source-of-truth order

When documentation and implementation disagree, resolve the discrepancy using this order:

1. Production `main` behavior and accepted production requirements.
2. The verification branch/PR currently being promoted to production.
3. Automated audit and test contracts.
4. These design documents.
5. Historical commits and retired design notes.

Historical material is useful for investigation, but it is not an active specification unless it has been restored deliberately.

## Documents

| Document | Scope |
|---|---|
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Overall application boundaries, page/runtime/data structure |
| [JAVASCRIPT_ARCHITECTURE.md](JAVASCRIPT_ARCHITECTURE.md) | Current JavaScript ownership, loading, dependency and observer rules |
| [TRANSFER_ARCHITECTURE.md](TRANSFER_ARCHITECTURE.md) | Character Sheets transfer, active bookmarklet route and dormant POST route |
| [ENVIRONMENT_AND_RELEASE.md](ENVIRONMENT_AND_RELEASE.md) | Production/verification relationship, promotion and visual baseline policy |
| [TESTING_AND_CI.md](TESTING_AND_CI.md) | Local verification and GitHub Actions quality gates |
| [DECISION_HISTORY.md](DECISION_HISTORY.md) | Chronological record of important architecture and operation decisions, including reverted and superseded decisions |
| [CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md) | CSS-next entry, cascade and ownership rules |
| [THEME_SYSTEM.md](THEME_SYSTEM.md) | Theme registry, scope and token ownership |
| [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) | Supabase migration-history contract |

## Documentation maintenance rule

A change that alters any of the following must update the corresponding design document in the same PR:

- page or runtime ownership;
- active/dormant feature routes;
- environment promotion policy;
- CI required behavior;
- database migration policy;
- CSS/theme loading contracts.

In addition, any change that introduces, reverses, supersedes, or materially reinterprets a long-lived architecture or operation decision must append an entry to [DECISION_HISTORY.md](DECISION_HISTORY.md) in the same PR. Do not rewrite history by deleting earlier decisions. Keep the earlier entry and add the later decision with its new status and reasoning.

Examples that require a decision-history entry include changing the canonical environment, adopting or reverting an architectural pattern, activating or retiring a feature route, changing source-of-truth ownership, changing a persistent compatibility rule, or changing what a required CI check means.

Minor UI adjustments and ordinary bug fixes do not require a history entry unless they establish a new rule future maintainers must preserve.

Do not create a second document for the same active contract. Amend the owner document instead.
