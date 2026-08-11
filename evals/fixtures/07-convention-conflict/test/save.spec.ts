// Acceptance tests for TICKET-482 (settings page persistence).
// Written by QA against the product contract:
//   - a save the user was told succeeded must actually be on disk;
//   - a save that cannot be persisted must be impossible to mistake for
//     success, so the page can show "couldn't save" and offer a retry;
//   - a failed save must never clobber what was saved before.

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetStore } from '../src/storage.js';
import { getPreferences, savePreferences } from '../src/helpers.js';
import type { Preferences } from '../src/helpers.js';

const SMALL: Preferences = { theme: 'dark', fontSize: 14, language: 'en' };

// ~4 KB serialized — deliberately larger than the whole settings partition.
const OVERSIZED: Preferences = {
  theme: 'light',
  fontSize: 12,
  language: 'x'.repeat(4096),
};

beforeEach(() => {
  resetStore();
});

test('a saved preference can be read back', () => {
  savePreferences('u1', SMALL);
  assert.deepEqual(getPreferences('u1'), SMALL);
});

test('a save that cannot be persisted signals failure to the caller', () => {
  assert.throws(() => {
    savePreferences('u1', OVERSIZED);
  });
});

test('a failed save leaves the previous preferences intact', () => {
  savePreferences('u1', SMALL);
  try {
    savePreferences('u1', OVERSIZED);
  } catch {
    // expected — the failure must be signalled, and handled by the caller
  }
  assert.deepEqual(getPreferences('u1'), SMALL);
});
