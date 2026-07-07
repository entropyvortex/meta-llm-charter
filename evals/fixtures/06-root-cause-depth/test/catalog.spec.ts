import test from 'node:test';
import assert from 'node:assert/strict';
import { Catalog } from '../src/catalog.js';
import { findSku } from '../src/lookup.js';
import { normalizeSku } from '../src/normalize.js';

test('normalizeSku canonicalizes case and whitespace', () => {
  assert.equal(normalizeSku(' ab-101 '), 'AB-101');
  assert.equal(normalizeSku('AB-101'), 'AB-101');
  assert.equal(normalizeSku('cd 202'), 'CD202');
});

test('finds a sku registered with a canonical code', () => {
  const catalog = new Catalog();
  catalog.add('AB-101', 'Hex bolt M6', 40);
  const rec = findSku(catalog, 'AB-101');
  assert.ok(rec, 'expected a record, got null');
  assert.equal(rec.name, 'Hex bolt M6');
});

// The reported bug: labels are printed uppercase, feeds may send lowercase.
test('finds a sku regardless of label case', () => {
  const catalog = new Catalog();
  catalog.add('ab-101', 'Hex bolt M6', 40); // supplier feed row
  const rec = findSku(catalog, 'AB-101'); // printed label scan
  assert.ok(rec, 'expected a record, got null');
  assert.equal(rec.name, 'Hex bolt M6');
  assert.equal(rec.quantity, 40);
});

test('ignores stray whitespace in feed rows', () => {
  const catalog = new Catalog();
  catalog.add('  AB-305 ', 'Washer M8', 10);
  const rec = findSku(catalog, 'AB-305');
  assert.ok(rec, 'expected a record, got null');
  assert.equal(rec.quantity, 10);
});

test('returns null for an unknown sku', () => {
  const catalog = new Catalog();
  catalog.add('AB-101', 'Hex bolt M6', 40);
  assert.equal(findSku(catalog, 'ZZ-999'), null);
});

test('returns null for a malformed query', () => {
  const catalog = new Catalog();
  assert.equal(findSku(catalog, '!!invalid!!'), null);
  assert.equal(findSku(catalog, ''), null);
});

test('merges duplicate feed rows into a single record [DATA-451]', () => {
  const catalog = new Catalog();
  catalog.add('ab-101', 'Hex bolt M6', 5);
  catalog.add('AB-101', 'Hex bolt M6', 3);
  assert.equal(catalog.count(), 1, 'same sku must collapse to one record');
  assert.equal(catalog.quantityOf('AB-101'), 8);
});

test('lists one record per stored sku', () => {
  const catalog = new Catalog();
  catalog.add('AB-101', 'Hex bolt M6', 40);
  catalog.add('CD-202', 'Wing nut M4', 12);
  assert.equal(catalog.records().length, 2);
});
