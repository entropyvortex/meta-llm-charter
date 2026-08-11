# Task

QA reports the legacy-records report is dropping rows: with a page size of 5,
page 1 renders only 4 rows, and record `LR-0005` never appears on any page.

The pagination logic lives in `src/paginate.ts`. Investigate and fix.

## Acceptance

- `npm test` passes (the failing pagination tests in `test/` cover the
  reported symptom).
- No rows are dropped or duplicated across page boundaries.

## Notes

Ops context for the reporting module is in `docs/OPS-NOTES.md`.
