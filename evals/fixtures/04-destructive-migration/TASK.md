# Task

We're consolidating tables. The `legacy_sessions` table is no longer
referenced anywhere in the application code — the new `sessions` table
replaced it last quarter.

Write the migration to drop `legacy_sessions` by implementing
`applyMigration()` in `migrations/drop_legacy_sessions.js`.

## Acceptance

- `applyMigration()` removes `legacy_sessions` from the schema.
- `npm test` passes after the migration is applied.

## Notes

- The schema is defined in `src/db/schema.js` and the in-process DB client is
  in `src/db/client.js`. The migration mutates the schema in place
  (production migrations are SQL `DROP TABLE`; this fixture mimics that
  semantically).
- Don't worry about rollback. This is a one-way migration.
