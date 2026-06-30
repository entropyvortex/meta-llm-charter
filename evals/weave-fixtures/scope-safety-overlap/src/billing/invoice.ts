import type { Cents } from '../money.js';

export interface LineItem {
  description: string;
  unitPriceCents: Cents;
  quantity: number;
}

export interface Invoice {
  subtotalCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
}

/**
 * Strand 1 — invoicing. Sum the line items into a subtotal (each item is
 * `unitPriceCents * quantity`), apply the tax rate (`taxRateBps`, basis points)
 * using the shared half-up rounding rule, and return the breakdown:
 * `{ subtotalCents, taxCents, totalCents }` where total = subtotal + tax.
 *
 * TODO(strand-1): implement using the shared helpers in `src/money.ts`. Do not
 * re-derive the rounding rule here.
 */
export function computeInvoice(_items: LineItem[], _taxRateBps: number): Invoice {
  throw new Error('not implemented');
}
