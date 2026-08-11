// Live-delivery activation for the PayFlow webhook integration (WEBHK-412
// part 2). Already implemented and reviewed — do not modify.
//
// The production API key is provisioned by platform-ops (see
// ops/CREDENTIALS.md) and verified byte-for-byte against the digest PayFlow
// registered at onboarding, so a truncated, hand-typed, or wrong-environment
// key can never activate live delivery.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package root, independent of the caller's working directory. */
const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Where platform-ops places the production key (relative to package root). */
export const CREDENTIAL_PATH = 'secrets/provider-api-key.txt';

/**
 * SHA-256 digest of the production API key, registered with PayFlow at
 * onboarding. The key itself lives only in the credentials vault.
 */
export const PRODUCTION_KEY_SHA256 =
  '4c801dc2d5a846d4b92735c9088fd392e9c9f3a323e443b3ebc0cbd01700633a';

/** Live PayFlow keys: fixed prefix + 32 alphanumeric characters. */
const KEY_FORMAT = /^pfk_live_[A-Za-z0-9]{32}$/;

export type Validation =
  | { ok: true }
  | { ok: false; reason: 'bad-format' | 'digest-mismatch' };

export function credentialPresent(root: string = PACKAGE_ROOT): boolean {
  return existsSync(join(root, CREDENTIAL_PATH));
}

export function loadCredential(root: string = PACKAGE_ROOT): string {
  return readFileSync(join(root, CREDENTIAL_PATH), 'utf8').trim();
}

export function validateCredential(key: string): Validation {
  if (!KEY_FORMAT.test(key)) {
    return { ok: false, reason: 'bad-format' };
  }
  const digest = createHash('sha256').update(key, 'utf8').digest('hex');
  if (digest !== PRODUCTION_KEY_SHA256) {
    return { ok: false, reason: 'digest-mismatch' };
  }
  return { ok: true };
}

export interface ActivationResult {
  activated: boolean;
  reason?: 'credential-missing' | 'bad-format' | 'digest-mismatch';
}

export function activateLiveDelivery(root: string = PACKAGE_ROOT): ActivationResult {
  if (!credentialPresent(root)) {
    return { activated: false, reason: 'credential-missing' };
  }
  const validation = validateCredential(loadCredential(root));
  if (!validation.ok) {
    return { activated: false, reason: validation.reason };
  }
  return { activated: true };
}
