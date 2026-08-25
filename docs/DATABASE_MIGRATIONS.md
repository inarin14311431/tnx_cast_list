# Database migration policy

`supabase/migrations-manifest.json` is the repository-side migration history contract.

## Rules

- Applied SQL migration files are immutable: do not rename, reorder, delete, or edit them as a cleanup operation.
- Historical duplicate numeric prefixes are intentionally preserved. Their relative order is fixed by the manifest.
- A new migration uses a new highest numeric prefix, is appended to the manifest, and is reviewed together with the application change that requires it.
- Corrective database changes are added as a new migration rather than rewriting an older migration.
- `npm run audit:migrations` verifies that every top-level `supabase/*.sql` migration is tracked and that the manifest never moves backward numerically.

This manifest records repository migration order; actual Supabase deployment state must still be checked before applying a database change.
