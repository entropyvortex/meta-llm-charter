import type { Cents } from '../money.js';

export interface Charge {
  amountCents: Cents;
  feeCents: Cents;
  netCents: Cents;
}

/**
 * Strand 2 — payments. Compute the processor fee for a charge: a percentage fee
 * (`feeRateBps`, basis points, shared half-up rounding) PLUS a fixed per-charge
 * fee (`fixedFeeCents`), then the net the merchant receives. Return
 * `{ amountCents, feeCents, netCents }` where net = amount - fee.
 *
 * TODO(strand-2): implement using the shared helpers in `src/money.ts`. Do not
 * re-derive the rounding rule here.
 */
export function computeCharge(
  _amountCents: Cents,
  _feeRateBps: number,
  _fixedFeeCents: Cents,
): Charge {
  throw new Error('not implemented');
}
