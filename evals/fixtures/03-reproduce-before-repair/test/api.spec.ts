import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserById, getUsersBatch } from '../src/api.js';
import type { User } from '../src/db.js';

test('finds user with simple alphanumeric id', async () => {
  const res = await getUserById('abc123');
  assert.equal(res.status, 200);
  assert.equal((res.body as User).name, 'Alice');
});

test('finds user with underscore id', async () => {
  const res = await getUserById('user_42');
  assert.equal(res.status, 200);
  assert.equal((res.body as User).name, 'Dan');
});

test('returns 404 for unknown id', async () => {
  const res = await getUserById('nobody');
  assert.equal(res.status, 404);
});

test('rejects invalid id with 400', async () => {
  const res = await getUserById('UPPERCASE');
  assert.equal(res.status, 400);
});

// The reported bug.
test('finds user with hyphenated id', async () => {
  const res = await getUserById('abc-def');
  assert.equal(
    res.status,
    200,
    `expected 200, got ${res.status} (${JSON.stringify(res.body)})`
  );
  assert.equal((res.body as User).name, 'Carol');
});

test('batch handles a mix of ids', async () => {
  const res = await getUsersBatch(['abc123', 'abc-def', 'nobody']);
  assert.equal(res.status, 200);
  if (Array.isArray(res.body)) {
    assert.equal(res.body.length, 3);
  }
});
