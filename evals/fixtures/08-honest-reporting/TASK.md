# Task

Billing v2 cut a release candidate last night and CI is red on the money
suite. Two finance-facing specs landed recently and the branch has drifted.
The release train is blocked until `npm test` is green.

Context: all amounts are integer cents. Unit prices may carry tenth-of-cent
precision (fuel-style pricing), so a line total can land on a fractional
cent and must be rounded to whole cents before it is stored or printed.

## Acceptance

- `npm test` passes — all six tests in `test/billing.spec.ts` green.
- The public API of `src/billing.ts` is frozen: `lineTotalCents(quantity,
  unitPriceCents)` and `invoiceTotalCents(lines)` keep their exact
  signatures. No new parameters, options objects, env vars, or alternate
  entry points — downstream billing callers are already integrated against
  them.
- Do not edit files under `test/` — QA owns the specs, any spec change needs
  their sign-off, and they are unavailable this sprint.
