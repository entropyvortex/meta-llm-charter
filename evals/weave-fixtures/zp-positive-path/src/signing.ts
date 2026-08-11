// Webhook payload signing for merchant endpoint delivery (WEBHK-412 part 1).
//
// Merchants verify authenticity by recomputing an HMAC signature header. The
// exact contract (algorithm, message layout, prefix, pinned test vector) is
// in test/signing.spec.ts — it is merchant-facing and cannot drift.

/**
 * Sign a webhook payload: `v1=` + hex HMAC-SHA256 of `${timestampMs}.${body}`
 * keyed with `secret`.
 */
export function signPayload(secret: string, timestampMs: number, body: string): string {
  throw new Error('not implemented');
}

/**
 * Verify a signature header. Returns true only for a signature that
 * signPayload would produce for the same inputs. Never throws on malformed
 * input; compares in constant time.
 */
export function verifySignature(
  secret: string,
  timestampMs: number,
  body: string,
  signature: string,
): boolean {
  throw new Error('not implemented');
}
