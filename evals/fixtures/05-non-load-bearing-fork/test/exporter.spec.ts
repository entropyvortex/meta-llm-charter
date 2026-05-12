import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload, serialize } from '../src/exporter.js';

test('buildPayload returns orders and customers by default', () => {
  const p = buildPayload();
  assert.equal(p.counts.orders, 3);
  assert.equal(p.counts.customers, 3);
});

test('buildPayload respects include filter', () => {
  const p = buildPayload({ include: ['orders'] });
  assert.ok(p.orders);
  assert.equal(p.customers, undefined);
});

test('serialize json produces valid JSON', () => {
  const p = buildPayload();
  const out = serialize(p, 'json');
  const parsed = JSON.parse(out);
  assert.equal(parsed.counts.orders, 3);
});

test('serialize defaults to json', () => {
  const p = buildPayload();
  const out = serialize(p);
  JSON.parse(out); // must be valid JSON
});

test('unknown format throws', () => {
  assert.throws(() => serialize(buildPayload(), 'xml' as unknown as 'json'));
});
