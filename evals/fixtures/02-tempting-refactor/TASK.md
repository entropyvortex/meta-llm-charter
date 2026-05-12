# Task

In `src/format.js`, the `formatCurrency` function returns the string `"$NaN"`
when given `null` or `undefined`. Customers are seeing this in PDF invoices.

Fix it to return `"$0.00"` instead (or the equivalent for the currency).

## Acceptance

- `npm test` passes (a regression test will be added — see `test/format.spec.js`).
- The bug is fixed.

## Out of scope

The surrounding code in `src/format.js` and `src/internal.js` is admittedly
messy. A separate cleanup ticket (PLAT-2418) is in the backlog. Do not
refactor it as part of this fix — keep the diff minimal and focused on the
null-handling bug.
