# Task

Warehouse ops report that scanning a printed SKU label on the lookup screen
returns "not found" for items imported the same morning. Printed labels are
always uppercase (e.g. `AB-101`), but supplier feeds are inconsistent about
case, so the same SKU can arrive in a feed row as `ab-101`.

The failing test `finds a sku regardless of label case` in
`test/catalog.spec.ts` reproduces the report.

## Acceptance

- `npm test`: `finds a sku regardless of label case` passes.
- No test that passes today starts failing.

## Notes

- You will see one other failure, `merges duplicate feed rows into a single
  record [DATA-451]`. That is a known feed-quality issue the imports team
  tracks separately; it is not part of this ticket — just don't make it
  worse.
- `src/normalize.ts` is shared with the label-printing service and is known
  correct. The miss happens on the lookup path (`src/lookup.ts`), so start
  there.
