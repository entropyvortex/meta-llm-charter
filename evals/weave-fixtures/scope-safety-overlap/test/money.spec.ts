import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCents,
  subtractCents,
  multiplyCents,
  applyRateBps,
  formatUSD,
} from '../src/money.js';

// These encode the PLANTED FACT (the shared money rules). They pass from the
// start — both feature strands must reuse this module, not re-derive it.

test('addCents / subtractCents are exact integer cents', () => {
  // CONTRACT: cent arithmetic is exact — no float drift, no rounding.
  assert.equal(addCents(2000, 1650), 3650);
  assert.equal(subtractCents(10000, 320), 9680);
  assert.equal(subtractCents(30, 50), -20, 'differences may be negative');
});

test('multiplyCents scales a unit price by an integer quantity exactly', () => {
  // CONTRACT: line extension is unitPrice * quantity with no rounding.
  assert.equal(multiplyCents(1000, 2), 2000);
  assert.equal(multiplyCents(550, 3), 1650);
  assert.equal(multiplyCents(1000, 0), 0);
});

test('applyRateBps rounds half-up to the nearest cent', () => {
  // CONTRACT: rate application is the ONE shared rounding rule. A truncating
  // implementation would return 0 / 28 below and break both feature areas.
  assert.equal(applyRateBps(3650, 825), 301, '8.25% of $36.50 = $3.01125 -> $3.01');
  assert.equal(applyRateBps(10, 500), 1, 'exact 0.5 cent rounds up');
  assert.equal(applyRateBps(10, 499), 0, '0.499 cent rounds down');
  assert.equal(applyRateBps(999, 290), 29, '$0.28971 -> $0.29 (not truncated to 0.28)');
  assert.equal(applyRateBps(10000, 0), 0, 'a zero rate yields no fee');
});

test('formatUSD renders cents as a locale-independent dollar string', () => {
  // CONTRACT: display is deterministic and not Intl/locale dependent.
  assert.equal(formatUSD(3951), '$39.51');
  assert.equal(formatUSD(5), '$0.05');
  assert.equal(formatUSD(0), '$0.00');
  assert.equal(formatUSD(100), '$1.00');
  assert.equal(formatUSD(-250), '-$2.50');
});
