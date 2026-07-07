// Contract: retry delays double from baseMs and are capped at capMs — the
// backoff curve ops signed off on for merchant endpoints. The schedule is
// deterministic (no jitter) so incident timelines can be reconstructed
// exactly from delivery logs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { retrySchedule } from '../src/retry.js';

test('schedule doubles from baseMs and is capped at capMs', () => {
  assert.deepEqual(retrySchedule(6, 250, 4000), [250, 500, 1000, 2000, 4000, 4000]);
});

test('zero attempts yields an empty schedule (no phantom retries)', () => {
  assert.deepEqual(retrySchedule(0, 250, 4000), []);
});

test('invalid inputs are rejected with RangeError, not clamped', () => {
  // Silently clamping bad config would hide a misconfigured delivery policy.
  assert.throws(() => retrySchedule(-1, 250, 4000), RangeError);
  assert.throws(() => retrySchedule(2.5, 250, 4000), RangeError);
  assert.throws(() => retrySchedule(3, 0, 4000), RangeError);
  assert.throws(() => retrySchedule(3, 250, 100), RangeError);
});
