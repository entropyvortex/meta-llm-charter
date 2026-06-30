import test from 'node:test';
import assert from 'node:assert/strict';
import type { CanonicalRecord } from '../src/types.js';
import { parse } from '../src/parser.js';
import { normalize } from '../src/normalizer.js';
import { exportRecords } from '../src/exporter.js';

// CONTRACT (Strand 3, PENDING — the remaining work): the exporter must serialize
// CanonicalRecord[] using the convention Strands 1 & 2 established and recorded
// in the seeded Insight Capsules — a `id|timestampMs|amountMinor|currency`
// header, one pipe-delimited line per record in that exact canonical field
// order, integer values emitted verbatim, the internal `sourceLine` field
// EXCLUDED, an empty currency rendered as an empty field, and a trailing
// newline. An exporter that invents its own format (reformatted amounts or
// timestamps, extra/missing columns, no header, a different delimiter) violates
// the contract and fails here. These FAIL until Strand 3 is implemented.

test('exporter serializes records in the canonical field order under a header', () => {
  const records: CanonicalRecord[] = [
    { id: 'a-1', timestampMs: 1704067200000, amountMinor: 500, currency: 'USD', sourceLine: 2 },
    { id: 'a-2', timestampMs: 1704067260000, amountMinor: 0, currency: '', sourceLine: 5 },
  ];
  const expected =
    'id|timestampMs|amountMinor|currency\n' +
    'a-1|1704067200000|500|USD\n' +
    'a-2|1704067260000|0|\n';
  assert.equal(exportRecords(records), expected);
});

test('exporter excludes the internal sourceLine provenance field', () => {
  const records: CanonicalRecord[] = [
    { id: 'x', timestampMs: 1, amountMinor: 2, currency: 'GBP', sourceLine: 999 },
  ];
  const out = exportRecords(records);
  assert.ok(!out.includes('999'), 'sourceLine must never appear in the export');
  assert.equal(out, 'id|timestampMs|amountMinor|currency\nx|1|2|GBP\n');
});

test('exporter emits header-only output (with trailing newline) for no records', () => {
  assert.equal(exportRecords([]), 'id|timestampMs|amountMinor|currency\n');
});

test('exporter round-trips the full parse -> normalize -> export pipeline', () => {
  const input = [
    '# data-pipeline export feed',
    'id=u-1001;ts=2024-01-01T00:00:00Z;amount=42.00;cur=usd',
    '',
    'id=u-1002;ts=2024-01-01T00:00:00Z;amount=19.99;cur=eur',
  ].join('\n');
  const records = parse(input).map(normalize);
  const expected =
    'id|timestampMs|amountMinor|currency\n' +
    records.map((r) => `${r.id}|${r.timestampMs}|${r.amountMinor}|${r.currency}`).join('\n') +
    '\n';
  assert.equal(exportRecords(records), expected);
});
