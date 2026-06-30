import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCharge } from '../src/payments/charge.js';

// CONTRACT: computeCharge fee = applyRateBps(amount, feeRateBps) + fixedFeeCents
// (shared half-up rounding), and net = amount - fee. amountCents passes through
// unchanged. Fails until strand 2 is implemented.

test('payments — percentage-plus-fixed fee and net (2.9% + 30c)', () => {
  const charge = computeCharge(10000, 290, 30); // $100.00 charge
  assert.equal(charge.amountCents, 10000, 'amount passes through unchanged');
  assert.equal(charge.feeCents, 320, '2.9% of 10000 = 290, + 30 fixed = 320');
  assert.equal(charge.netCents, 9680, 'net = amount - fee');
});

test('payments — fee uses half-up rounding, not truncation', () => {
  // 2.9% of 999c = 28.971c -> 29c. A truncating implementation would give 28.
  const charge = computeCharge(999, 290, 0);
  assert.equal(charge.feeCents, 29);
  assert.equal(charge.netCents, 970);
});

test('payments — a zero percentage rate leaves only the fixed fee', () => {
  const charge = computeCharge(5000, 0, 30);
  assert.equal(charge.feeCents, 30);
  assert.equal(charge.netCents, 4970);
});
