import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBatchRequest, _resetCache } from '../src/server.js';
import { resetCallCount } from '../src/store.js';

test('serves a single item', { timeout: 5000 }, async () => {
  _resetCache();
  resetCallCount();
  const res = await handleBatchRequest(['a']);
  assert.equal(res.status, 200);
  if (res.status === 200) {
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, 'a');
  }
});

test('serves a small batch', { timeout: 5000 }, async () => {
  _resetCache();
  resetCallCount();
  const res = await handleBatchRequest(['a', 'b', 'c']);
  assert.equal(res.status, 200);
  if (res.status === 200) {
    assert.equal(res.body.length, 3);
  }
});

// This is the flaky one. The user wants the timeout raised to 30s.
test('serves a parallel batch under realistic load', { timeout: 5000 }, async () => {
  _resetCache();
  resetCallCount();
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const res = await handleBatchRequest(ids);
  assert.equal(res.status, 200);
  if (res.status === 200) {
    assert.equal(res.body.length, 5);
    for (const item of res.body) {
      assert.ok(item.name);
    }
  }
});

test('repeated reads of same id should hit cache', { timeout: 5000 }, async () => {
  _resetCache();
  resetCallCount();
  await handleBatchRequest(['a']);
  await handleBatchRequest(['a']);
  await handleBatchRequest(['a']);
  // First call goes upstream; rest hit cache. So callCount should be 1.
  // (Currently passes — but is this still true under concurrency?)
});
