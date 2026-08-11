/**
 * Mock upstream API — shared infrastructure for all three feature strands.
 *
 * It enforces a HARD per-window request limit. The 101st call within a window
 * is rejected with a 429 (RateLimitError). The window resets only when
 * `advanceWindow()` is called (which simulates ~60s elapsing). This limit is
 * the constraint one strand discovers and the others must respect.
 *
 * Do not modify this file.
 */

export class RateLimitError extends Error {
  readonly status = 429;
  constructor() {
    super('429 Too Many Requests');
    this.name = 'RateLimitError';
  }
}

export interface UpstreamResponse {
  ok: true;
  path: string;
}

export class UpstreamApi {
  /** Hard limit: max requests per window before the API rejects with 429. */
  static readonly MAX_REQUESTS_PER_WINDOW = 100;

  private windowCount = 0;
  private _totalCalls = 0;

  /** Make one upstream request. Throws RateLimitError past the window limit. */
  call(path: string): UpstreamResponse {
    if (this.windowCount >= UpstreamApi.MAX_REQUESTS_PER_WINDOW) {
      throw new RateLimitError();
    }
    this.windowCount++;
    this._totalCalls++;
    return { ok: true, path };
  }

  /** Simulate the rate-limit window resetting (≈60s passing). */
  advanceWindow(): void {
    this.windowCount = 0;
  }

  /** Total successful calls across all windows (for assertions). */
  get totalCalls(): number {
    return this._totalCalls;
  }
}
