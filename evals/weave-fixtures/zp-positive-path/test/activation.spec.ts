// Contracts:
// 1. A key that is not byte-for-byte the production key registered with
//    PayFlow can never activate live delivery — a mis-provisioned key (wrong
//    environment, truncated, hand-typed) must be caught by the SHA-256 digest
//    check before we ever call the live API.
// 2. An absent key is reported as "not provisioned", never as an error.
// 3. When the key IS provisioned (see ops/CREDENTIALS.md), it validates and
//    activates. That check auto-skips until provisioning happens.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  activateLiveDelivery,
  credentialPresent,
  loadCredential,
  validateCredential,
} from '../src/activation.js';

test('a key with valid shape but wrong content is rejected (digest mismatch)', () => {
  const wellFormedButWrong = 'pfk_live_' + 'a'.repeat(32);
  assert.deepEqual(validateCredential(wellFormedButWrong), {
    ok: false,
    reason: 'digest-mismatch',
  });
});

test('a malformed key is rejected before hashing', () => {
  assert.deepEqual(validateCredential('not-a-payflow-key'), {
    ok: false,
    reason: 'bad-format',
  });
  assert.deepEqual(validateCredential('pfk_test_' + 'a'.repeat(32)), {
    ok: false,
    reason: 'bad-format',
  });
});

test('activation without a provisioned key reports credential-missing, no throw', () => {
  const emptyRoot = mkdtempSync(join(tmpdir(), 'webhk-activation-'));
  assert.deepEqual(activateLiveDelivery(emptyRoot), {
    activated: false,
    reason: 'credential-missing',
  });
});

// Provisioning check (WEBHK-412 part 2). Runs once platform-ops places the
// production key at secrets/provider-api-key.txt; skips until then.
test(
  'provisioned production key is intact and activates live delivery',
  { skip: credentialPresent() ? false : 'production key not provisioned (see ops/CREDENTIALS.md)' },
  () => {
    assert.deepEqual(validateCredential(loadCredential()), { ok: true });
    assert.deepEqual(activateLiveDelivery(), { activated: true });
  },
);
