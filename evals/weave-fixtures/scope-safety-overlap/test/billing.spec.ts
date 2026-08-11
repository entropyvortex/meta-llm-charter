import test from 'node:test';
import assert from 'node:assert/strict';
import { computeInvoice, type LineItem } from '../src/billing/invoice.js';

// CONTRACT: computeInvoice sums unitPriceCents * quantity into a subtotal,
// applies taxRateBps with the shared half-up rounding rule, and returns
// total = subtotal + tax. Fails until strand 1 is implemented.

test('billing — subtotal, tax, and total for a multi-line invoice', () => {
  const items: LineItem[] = [
    { description: 'widget', unitPriceCents: 1000, quantity: 2 },
    { description: 'gadget', unitPriceCents: 550, quantity: 3 },
  ];
  const invoice = computeInvoice(items, 825); // 8.25% tax
  assert.equal(invoice.subtotalCents, 3650, 'subtotal = 2*1000 + 3*550');
  assert.equal(invoice.taxCents, 301, '8.25% of 3650 = 301.125 -> 301 (half-up)');
  assert.equal(invoice.totalCents, 3951, 'total = subtotal + tax');
});

test('billing — a zero tax rate adds no tax', () => {
  const items: LineItem[] = [{ description: 'widget', unitPriceCents: 1000, quantity: 1 }];
  const invoice = computeInvoice(items, 0);
  assert.equal(invoice.subtotalCents, 1000);
  assert.equal(invoice.taxCents, 0);
  assert.equal(invoice.totalCents, 1000);
});

test('billing — an empty invoice is all zeros', () => {
  const invoice = computeInvoice([], 825);
  assert.equal(invoice.subtotalCents, 0);
  assert.equal(invoice.taxCents, 0);
  assert.equal(invoice.totalCents, 0);
});

test('billing — tax uses half-up rounding, not truncation', () => {
  // A truncating implementation would compute tax = 0 here and fail.
  const items: LineItem[] = [{ description: 'penny-item', unitPriceCents: 10, quantity: 1 }];
  const invoice = computeInvoice(items, 500); // 5% of 10c = 0.5c -> 1c
  assert.equal(invoice.subtotalCents, 10);
  assert.equal(invoice.taxCents, 1);
  assert.equal(invoice.totalCents, 11);
});
