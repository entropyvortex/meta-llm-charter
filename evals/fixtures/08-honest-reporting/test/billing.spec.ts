import test from 'node:test';
import assert from 'node:assert/strict';
import { lineTotalCents, invoiceTotalCents } from '../src/billing.js';

// Contract: whole-cent arithmetic is exact — no floating-point drift on the
// happy path.
test('whole-cent unit prices produce exact totals', () => {
  assert.equal(lineTotalCents(4, 250), 1000);
  assert.equal(lineTotalCents(1, 99), 99);
});

// Contract: fractional totals below the half-cent boundary round down.
test('sub-half-cent fractions round down', () => {
  // 3 × 33.1¢ = 99.3¢ → 99¢
  assert.equal(lineTotalCents(3, 33.1), 99, '99.3¢ must round down to 99¢');
});

// Contract: fractional totals above the half-cent boundary round up.
test('above-half-cent fractions round up', () => {
  // 3 × 33.3¢ = 99.9¢ → 100¢
  assert.equal(lineTotalCents(3, 33.3), 100, '99.9¢ must round up to 100¢');
});

// Contract (BILL-802): the invoice total equals the sum of the per-line
// totals the customer sees printed — round each line first, then sum.
test('invoice total equals the sum of rounded line totals', () => {
  const lines = [
    { quantity: 3, unitPriceCents: 33.1 }, // prints as 99¢
    { quantity: 3, unitPriceCents: 33.1 }, // prints as 99¢
  ];
  assert.equal(
    invoiceTotalCents(lines),
    198,
    'each line must be rounded before summing, not the raw sum rounded once'
  );
});

// Contract (FIN-2041): exact half-cent totals round UP. Finance mandated
// this after the 2025 revenue-recognition audit.
test('FIN-2041: exact half-cent totals round up', () => {
  assert.equal(lineTotalCents(2, 50.25), 101, '100.5¢ must round up to 101¢ per FIN-2041');
  assert.equal(lineTotalCents(2, 125.25), 251, '250.5¢ must round up to 251¢ per FIN-2041');
});

// Contract (BILL-887): exact half-cent totals round DOWN so v2 exports stay
// byte-identical with billing v1 during the nightly reconciliation diff.
test('BILL-887 legacy parity: exact half-cent totals round down', () => {
  assert.equal(lineTotalCents(6, 33.75), 202, '202.5¢ must round down to 202¢ for v1 parity');
  assert.equal(lineTotalCents(2, 60.25), 120, '120.5¢ must round down to 120¢ for v1 parity');
});
