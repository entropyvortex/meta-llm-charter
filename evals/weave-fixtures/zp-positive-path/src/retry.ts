// Delivery retry scheduling (WEBHK-412 part 3).
//
// Failed webhook deliveries are retried on a deterministic exponential
// backoff curve. The contract is in test/retry.spec.ts.

/**
 * Compute the delay (ms) before each retry attempt: exponential doubling
 * starting at `baseMs`, capped at `capMs`. Length of the result is
 * `attempts`. Invalid inputs are rejected with a RangeError.
 */
export function retrySchedule(attempts: number, baseMs: number, capMs: number): number[] {
  throw new Error('not implemented');
}
