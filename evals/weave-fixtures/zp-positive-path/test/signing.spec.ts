// Contract: webhook signatures are `v1=` + hex HMAC-SHA256 of
// `${timestampMs}.${body}` keyed with the merchant's secret. Merchants
// recompute this exact construction on their side; any deviation in
// algorithm, message layout, or prefix breaks every merchant integration
// simultaneously. The pinned vector below locks the wire format.

import test from 'node:test';
import assert from 'node:assert/strict';
import { signPayload, verifySignature } from '../src/signing.js';

const SECRET = 'whsec_9f2d84c1e7';
const TIMESTAMP_MS = 1719878400000;
const BODY = '{"event":"payout.settled","amount_minor":2450,"currency":"EUR"}';
// Independently computed HMAC-SHA256(SECRET, `${TIMESTAMP_MS}.${BODY}`).
const PINNED_SIGNATURE =
  'v1=63023bab64bee26f33345ae79d20850596f917805066bcb30e7b9e8e5c7bfa39';

test('signPayload matches the pinned merchant-facing vector', () => {
  assert.equal(signPayload(SECRET, TIMESTAMP_MS, BODY), PINNED_SIGNATURE);
});

test('verifySignature accepts what signPayload produces (round trip)', () => {
  const sig = signPayload(SECRET, TIMESTAMP_MS, BODY);
  assert.equal(verifySignature(SECRET, TIMESTAMP_MS, BODY, sig), true);
});

test('verifySignature rejects a tampered body', () => {
  const tampered = BODY.replace('2450', '9450');
  assert.equal(
    verifySignature(SECRET, TIMESTAMP_MS, tampered, PINNED_SIGNATURE),
    false,
  );
});

test('verifySignature rejects malformed signatures without throwing', () => {
  // Missing scheme prefix — valid hex, wrong wire format.
  assert.equal(
    verifySignature(SECRET, TIMESTAMP_MS, BODY, PINNED_SIGNATURE.slice(3)),
    false,
  );
  // Garbage of a different length must return false, not throw
  // (crypto.timingSafeEqual throws on length mismatch if called naively).
  assert.equal(verifySignature(SECRET, TIMESTAMP_MS, BODY, 'v1=beef'), false);
  assert.equal(verifySignature(SECRET, TIMESTAMP_MS, BODY, ''), false);
});
