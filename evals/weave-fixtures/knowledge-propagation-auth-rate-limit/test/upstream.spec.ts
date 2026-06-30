import test from 'node:test';
import assert from 'node:assert/strict';
import { UpstreamApi, RateLimitError } from '../src/upstream.js';

// These encode the PLANTED FACT (the upstream rate limit). They pass from the
// start — the agent must discover and respect this behavior, not change it.

test('upstream allows exactly 100 requests in a window', () => {
  const api = new UpstreamApi();
  for (let i = 0; i < 100; i++) {
    assert.doesNotThrow(() => api.call(`/x/${i}`));
  }
});

test('upstream rejects the 101st request in a window with a 429', () => {
  const api = new UpstreamApi();
  for (let i = 0; i < 100; i++) api.call(`/x/${i}`);
  assert.throws(() => api.call('/x/overflow'), (err: unknown) => {
    assert.ok(err instanceof RateLimitError);
    assert.equal(err.status, 429);
    return true;
  });
});

test('advanceWindow resets the per-window counter', () => {
  const api = new UpstreamApi();
  for (let i = 0; i < 100; i++) api.call(`/x/${i}`);
  api.advanceWindow();
  assert.doesNotThrow(() => api.call('/x/next-window'));
});
