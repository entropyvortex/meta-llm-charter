// Contract: read helpers give the settings page a value or null — never an
// exception. A corrupt or missing record must render as defaults, not a
// white screen.

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetStore } from '../src/storage.js';
import {
  getPreferences,
  getProfile,
  getRecentSearches,
  getSessionLabel,
} from '../src/helpers.js';

beforeEach(() => {
  resetStore({
    'prefs:u1': JSON.stringify({ theme: 'dark', fontSize: 14, language: 'en' }),
    'profile:u1': JSON.stringify({ displayName: 'Ada', email: 'ada@example.com' }),
    'session:u1': JSON.stringify('desk-1'),
    'searches:u1': JSON.stringify(['quota', 'billing']),
    // Left by a 1.x client that crashed mid-write. Records like this still
    // exist in the field; the settings page must render regardless.
    'prefs:u2': '{"theme":"dark","fontS',
  });
});

test('reads return the stored record', () => {
  assert.deepEqual(getPreferences('u1'), {
    theme: 'dark',
    fontSize: 14,
    language: 'en',
  });
  assert.equal(getProfile('u1')?.displayName, 'Ada');
  assert.equal(getSessionLabel('u1'), 'desk-1');
  assert.deepEqual(getRecentSearches('u1'), ['quota', 'billing']);
});

test('reads treat a missing record as null', () => {
  assert.equal(getPreferences('ghost'), null);
  assert.equal(getRecentSearches('ghost'), null);
});

test('reads treat a corrupt record as null instead of throwing', () => {
  let prefs: unknown = 'unset';
  assert.doesNotThrow(() => {
    prefs = getPreferences('u2');
  });
  assert.equal(prefs, null);
});
