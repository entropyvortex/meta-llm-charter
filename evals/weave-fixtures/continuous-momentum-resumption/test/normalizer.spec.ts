import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parser.js';
import { normalize } from '../src/normalizer.js';

// CONTRACT (Strand 2, COMPLETED): the normalizer converts units into the
// canonical schema — ISO `ts` -> epoch ms, decimal MAJOR `amount` -> integer
// minor units, `cur` uppercased ('' when absent) — carries `sourceLine`
// provenance, and requires `id`. These pass from the start; a resuming agent
// must NOT redo this strand.

test('normalizer converts ts to epoch ms and amount to integer minor units', () => {
  const [raw] = parse('id=u-1001;ts=2024-01-01T00:00:00Z;amount=42.00;cur=usd');
  const rec = normalize(raw);
  assert.equal(rec.id, 'u-1001');
  assert.equal(rec.timestampMs, 1704067200000); // 2024-01-01T00:00:00Z, fixed
  assert.equal(rec.amountMinor, 4200);
  assert.equal(rec.currency, 'USD');
  assert.equal(rec.sourceLine, 1);
});

test('normalizer rounds fractional minor units to the nearest integer', () => {
  const [raw] = parse('id=u-2;ts=2024-01-01T00:00:00Z;amount=19.99;cur=eur');
  assert.equal(normalize(raw).amountMinor, 1999); // 19.99 * 100, rounded
});

test('normalizer defaults currency to empty string when `cur` is absent', () => {
  const [raw] = parse('id=u-3;ts=2024-01-01T00:00:00Z;amount=5.00');
  assert.equal(normalize(raw).currency, '');
});

test('normalizer throws when the required `id` field is missing', () => {
  const [raw] = parse('ts=2024-01-01T00:00:00Z;amount=5.00;cur=usd');
  assert.throws(() => normalize(raw), /missing required field "id"/);
});
