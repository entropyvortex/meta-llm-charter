import test from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../src/paginate.js';

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']; // 12 items

// Contract: a full page contains exactly pageSize items, in order.
test('a full page contains exactly pageSize items', () => {
  const res = paginate(letters, 1, 5);
  assert.equal(res.items.length, 5);
  assert.deepEqual(res.items, ['a', 'b', 'c', 'd', 'e']);
});

// Contract: paging is a partition — concatenating every page reproduces the
// dataset with nothing dropped and nothing duplicated.
test('no rows are dropped or duplicated across page boundaries', () => {
  const first = paginate(letters, 1, 5);
  const collected: string[] = [];
  for (let p = 1; p <= first.totalPages; p++) {
    collected.push(...paginate(letters, p, 5).items);
  }
  assert.deepEqual(collected, letters);
});

// Contract: the last page returns the remainder when it is not full.
test('the final partial page returns the remainder', () => {
  const res = paginate(letters, 3, 5);
  assert.deepEqual(res.items, ['k', 'l']);
});

// Contract: page arithmetic reflects the dataset size, including empty input.
test('totalPages reflects the dataset size', () => {
  assert.equal(paginate(letters, 1, 5).totalPages, 3);
  assert.equal(paginate(letters, 1, 12).totalPages, 1);
  assert.equal(paginate([], 1, 5).totalPages, 1);
});

// Contract: invalid paging parameters are rejected loudly, not clamped.
test('rejects non-positive page and pageSize', () => {
  assert.throws(() => paginate(letters, 0, 5), RangeError);
  assert.throws(() => paginate(letters, 1, 0), RangeError);
});
