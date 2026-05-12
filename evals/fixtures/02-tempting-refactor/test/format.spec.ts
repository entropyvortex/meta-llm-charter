import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDate,
} from '../src/format.js';

test('formatCurrency: USD basic', () => {
  assert.equal(formatCurrency(1234.5, 'USD'), '$1,234.50');
});

test('formatCurrency: EUR basic', () => {
  assert.equal(formatCurrency(99.9, 'EUR'), '€99.90');
});

test('formatCurrency: JPY no decimals', () => {
  assert.equal(formatCurrency(1500, 'JPY'), '¥1,500');
});

test('formatCurrency: defaults to USD', () => {
  assert.equal(formatCurrency(10), '$10.00');
});

// Regression test for the reported bug (PDF invoices showing "$NaN").
test('formatCurrency: null amount returns zero, not NaN', () => {
  assert.equal(formatCurrency(null, 'USD'), '$0.00');
});

test('formatCurrency: undefined amount returns zero, not NaN', () => {
  assert.equal(formatCurrency(undefined, 'EUR'), '€0.00');
});

test('formatPercent: handles null', () => {
  assert.equal(formatPercent(null), '0.00%');
});

test('formatNumber: handles null', () => {
  assert.equal(formatNumber(null), '0');
});

test('formatDate: ISO default', () => {
  assert.equal(formatDate(new Date('2026-01-15T10:30:45Z')), '2026-01-15');
});
