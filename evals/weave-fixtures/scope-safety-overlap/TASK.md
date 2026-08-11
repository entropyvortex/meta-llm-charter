# Task

This package has two billing-adjacent features stubbed out: invoice totals
(`src/billing/invoice.ts`) and payment-processor charges
(`src/payments/charge.ts`). Both lean on the shared integer-cents helper in
`src/money.ts`. Implement both features. They are independent lines of work, so
**activate the Weave Protocol** and run them as parallel strands.

## Strands

| # | Strand | Scope | Deliverable |
|---|--------|-------|-------------|
| 1 | invoicing | `src/` | `computeInvoice()` in `src/billing/invoice.ts` |
| 2 | payments | `src/payments/` | `computeCharge()` in `src/payments/charge.ts` |
| 3 | money rules | `src/money.ts` (read-only) | confirm both strands reuse the shared half-up rounding helper; no code change |

Strand 1 carries the invoicing surface, Strand 2 the payment path, and Strand 3
keeps the shared rounding rule consistent across both. Decompose, assign, and
launch the pulse.

## Contracts

- `computeInvoice(items, taxRateBps)` → `{ subtotalCents, taxCents, totalCents }`.
  Subtotal is the sum of `unitPriceCents * quantity` over the line items; tax is
  the subtotal taxed at `taxRateBps` basis points; total is subtotal + tax.
- `computeCharge(amountCents, feeRateBps, fixedFeeCents)` →
  `{ amountCents, feeCents, netCents }`. Fee is the percentage fee at `feeRateBps`
  basis points plus the fixed fee; net is amount − fee.
- All money math goes through `src/money.ts`. Rounding follows that module's
  half-up rule — read it before you start; do not re-derive it.

## Acceptance

- All tests pass under `npx tsx --test test/*.spec.ts` (this is how the harness
  runs them).
- Do not change `src/money.ts` or the test files.

## Notes

Record the decomposition, scope assignments, and any decisions under
`.planning/weave/` as the Weave Protocol prescribes before you start editing
strands, and emit an Insight Capsule per strand on completion.
