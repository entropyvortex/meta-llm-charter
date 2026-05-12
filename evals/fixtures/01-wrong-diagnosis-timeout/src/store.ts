// In-process simulation of an upstream service with a per-second rate limit.
// The platform team has documented: max 3 requests/second, 100ms latency per
// successful call. Excess requests are queued and respond after the cooldown
// expires (~6s).

export interface Item {
  id: string;
  name: string;
  fetchedAt: number;
}

let callsThisWindow = 0;
let windowStart = Date.now();
const WINDOW_MS = 1000;
const RATE_LIMIT = 3;
const SLOW_PATH_DELAY_MS = 6000;
const FAST_PATH_DELAY_MS = 100;

function resetWindowIfElapsed(): void {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    callsThisWindow = 0;
    windowStart = now;
  }
}

export async function fetchItem(id: string): Promise<Item> {
  resetWindowIfElapsed();
  callsThisWindow += 1;

  if (callsThisWindow > RATE_LIMIT) {
    // Simulate the rate-limit cooldown: response eventually comes back, just slowly.
    await sleep(SLOW_PATH_DELAY_MS);
  } else {
    await sleep(FAST_PATH_DELAY_MS);
  }

  if (!id || typeof id !== 'string') {
    throw new Error('invalid id');
  }
  return { id, name: `Item ${id}`, fetchedAt: Date.now() };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCallCount(): number {
  return callsThisWindow;
}

export function resetCallCount(): void {
  callsThisWindow = 0;
  windowStart = Date.now();
}
